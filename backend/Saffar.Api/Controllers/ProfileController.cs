using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Saffar.Api.Data;
using System.Security.Claims;

namespace Saffar.Api.Controllers
{
    [ApiController]
    [Route("api/profile")]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly SaffarDbContext _context;

        public ProfileController(SaffarDbContext context)
        {
            _context = context;
        }

        // GET /api/profile/me
        [HttpGet("me")]
        public IActionResult GetMe()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var user   = _context.Users.FirstOrDefault(u => u.Id == userId);
            if (user == null) return NotFound();

            return Ok(new
            {
                id                = user.Id,
                fullName          = user.FullName,
                email             = user.Email,
                phoneNumber       = user.PhoneNumber,
                cnic              = user.CNIC,
                dateOfBirth       = user.DateOfBirth,
                age               = CalculateAge(user.DateOfBirth),
                gender            = user.Gender,
                rating            = user.Rating,
                role              = user.Role,
                isProfileComplete = user.IsProfileComplete,
                isVerified        = user.IsVerified,
                status            = user.DriverStatus,
                profileImageUrl   = user.ProfileImageUrl,
                cnicImageUrl      = user.CNICImageUrl,
                licenseImageUrl   = user.LicenseImageUrl
            });
        }

        private static int? CalculateAge(DateTime? dob)
        {
            if (!dob.HasValue) return null;
            var today = DateTime.Today;
            int age   = today.Year - dob.Value.Year;
            if (dob.Value.Date > today.AddYears(-age)) age--;
            return age;
        }

        // PUT /api/profile/update  — update editable fields only (age, gender)
        [HttpPut("update")]
        public async Task<IActionResult> UpdateProfile([FromForm] ProfileUpdateRequest req)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var user   = _context.Users.FirstOrDefault(u => u.Id == userId);
            if (user == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(req.FullName))     user.FullName    = req.FullName;
            if (!string.IsNullOrWhiteSpace(req.Gender))      user.Gender      = req.Gender;
            if (!string.IsNullOrWhiteSpace(req.Email))       user.Email       = req.Email;
            if (!string.IsNullOrWhiteSpace(req.PhoneNumber)) user.PhoneNumber = req.PhoneNumber;
            if (req.DateOfBirth.HasValue)                    user.DateOfBirth = req.DateOfBirth.Value;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Profile updated" });
        }

        // POST /api/profile/upload-documents
        [HttpPost("upload-documents")]
        public async Task<IActionResult> UploadDocuments([FromForm] UploadDocumentsRequest req)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var user   = _context.Users.FirstOrDefault(u => u.Id == userId);
            if (user == null) return NotFound();

            // Block re-upload after first submission
            if (user.IsProfileComplete)
                return BadRequest(new { message = "Documents already submitted. Contact admin for changes." });

            // ── Validate required files per role ───────────────────────────────
            if (req.ProfileImage == null)
                return BadRequest(new { message = "Profile image is required." });
            if (req.CnicImage == null)
                return BadRequest(new { message = "CNIC image is required." });
            if (user.Role == "Driver" && req.LicenseImage == null)
                return BadRequest(new { message = "Driving license is required for drivers." });

            // ── File type and size validation ──────────────────────────────────
            var allowedExts = new[] { ".jpg", ".jpeg", ".png", ".pdf" };
            const long maxBytes = 3 * 1024 * 1024; // 3 MB

            string? Validate(IFormFile file)
            {
                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!allowedExts.Contains(ext))
                    return $"'{file.FileName}': only jpg, png, pdf allowed.";
                if (file.Length > maxBytes)
                    return $"'{file.FileName}': max size is 3 MB.";
                return null;
            }

            foreach (var file in new[] { req.ProfileImage, req.CnicImage, req.LicenseImage })
            {
                if (file == null) continue;
                var err = Validate(file);
                if (err != null) return BadRequest(new { message = err });
            }

            // ── Save files ─────────────────────────────────────────────────────
            string Save(IFormFile file, string folder)
            {
                var dir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", folder);
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                var name = Guid.NewGuid() + Path.GetExtension(file.FileName).ToLowerInvariant();
                using var stream = new FileStream(Path.Combine(dir, name), FileMode.Create);
                file.CopyTo(stream);
                return $"/uploads/{folder}/{name}";
            }

            user.ProfileImageUrl = Save(req.ProfileImage, "profiles");
            user.CNICImageUrl    = Save(req.CnicImage,    "cnic");
            if (req.LicenseImage != null)
                user.LicenseImageUrl = Save(req.LicenseImage, "licenses");

            user.IsProfileComplete = true;
            user.DriverStatus      = "Pending";   // awaiting admin review
            user.IsVerified        = false;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Documents uploaded successfully. Awaiting admin review." });
        }
    }

    public class UploadDocumentsRequest
    {
        public IFormFile? ProfileImage { get; set; }
        public IFormFile? CnicImage    { get; set; }
        public IFormFile? LicenseImage { get; set; }
    }

    public class ProfileUpdateRequest
    {
        public string?   FullName     { get; set; }
        public string?   Gender       { get; set; }
        public string?   Email        { get; set; }
        public string?   PhoneNumber  { get; set; }
        public DateTime? DateOfBirth  { get; set; }
    }
}
