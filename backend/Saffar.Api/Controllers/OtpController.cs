using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Saffar.Api.Data;
using Saffar.Api.Models;
using Saffar.Api.Services;

namespace Saffar.Api.Controllers
{
    [ApiController]
    [Route("api/otp")]
    public class OtpController : ControllerBase
    {
        private readonly SaffarDbContext _db;
        private readonly IOtpService _otp;

        public OtpController(SaffarDbContext db, IOtpService otp)
        {
            _db = db;
            _otp = otp;
        }

        public class SendOtpRequest
        {
            public string Email { get; set; } = "";
            /// <summary>"SignupEmail" (default) or "EmailChange".</summary>
            public string? Purpose { get; set; }
            /// <summary>For EmailChange: the new email to swap to on verify.</summary>
            public string? NewEmail { get; set; }
        }

        public class VerifyOtpRequest
        {
            public string Email { get; set; } = "";
            public string Code { get; set; } = "";
            public string? Purpose { get; set; }
        }

        // POST /api/otp/send
        [HttpPost("send")]
        [AllowAnonymous]
        public async Task<IActionResult> Send([FromBody] SendOtpRequest req, CancellationToken ct)
        {
            var purpose = string.IsNullOrWhiteSpace(req.Purpose)
                ? OtpPurpose.SignupEmail
                : req.Purpose.Trim();

            var email = (req.Email ?? "").Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(email))
                return BadRequest(new { message = "Email is required." });

            if (purpose == OtpPurpose.EmailChange)
            {
                // Must be called by an authenticated user changing their own email.
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null) return Unauthorized();
                var userId = Guid.Parse(userIdClaim);

                var user = await _db.Users.FindAsync(new object?[] { userId }, ct);
                if (user == null) return Unauthorized();

                var newEmail = (req.NewEmail ?? "").Trim().ToLowerInvariant();
                if (string.IsNullOrEmpty(newEmail))
                    return BadRequest(new { message = "New email is required." });
                if (newEmail == user.Email)
                    return BadRequest(new { message = "The new email matches your current one." });
                if (await _db.Users.AnyAsync(u => u.Email == newEmail, ct))
                    return BadRequest(new { message = "This email is already in use." });

                // Code is emailed to the NEW address (proof of possession).
                var result = await _otp.IssueAsync(newEmail, OtpPurpose.EmailChange, targetEmail: newEmail, ct: ct);
                if (!result.Ok)
                    return StatusCode(429, new { message = result.Error, retryAfterSeconds = result.RetryAfterSeconds });
                return Ok(new { message = "OTP sent.", devOtp = result.DevOtp });
            }

            // SignupEmail — no auth required; user may not have logged in yet.
            var issue = await _otp.IssueAsync(email, OtpPurpose.SignupEmail, ct: ct);
            if (!issue.Ok)
                return StatusCode(429, new { message = issue.Error, retryAfterSeconds = issue.RetryAfterSeconds });
            return Ok(new { message = "OTP sent.", devOtp = issue.DevOtp });
        }

        // POST /api/otp/verify
        [HttpPost("verify")]
        [AllowAnonymous]
        public async Task<IActionResult> Verify([FromBody] VerifyOtpRequest req, CancellationToken ct)
        {
            var purpose = string.IsNullOrWhiteSpace(req.Purpose)
                ? OtpPurpose.SignupEmail
                : req.Purpose.Trim();
            var email = (req.Email ?? "").Trim().ToLowerInvariant();

            var result = await _otp.VerifyAsync(email, purpose, req.Code ?? "", ct);
            switch (result.Status)
            {
                case OtpVerifyStatus.NotFound:
                case OtpVerifyStatus.Consumed:
                    return BadRequest(new { message = "No active code for this email." });
                case OtpVerifyStatus.Expired:
                    return BadRequest(new { message = "This code has expired. Request a new one." });
                case OtpVerifyStatus.TooManyAttempts:
                    return BadRequest(new { message = "Too many incorrect attempts. Request a new code." });
                case OtpVerifyStatus.Invalid:
                    return BadRequest(new { message = "Incorrect code. Please try again." });
            }

            // OK branch. Apply the side effect based on purpose.
            var code = result.Code!;

            if (purpose == OtpPurpose.SignupEmail)
            {
                var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
                if (user == null)
                    return BadRequest(new { message = "No account found for this email." });
                user.IsEmailVerified = true;
                user.EmailVerifiedAt = TimeZoneHelper.GetPakistanTime();
                await _db.SaveChangesAsync(ct);
                return Ok(new { message = "Email verified." });
            }

            if (purpose == OtpPurpose.EmailChange)
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null) return Unauthorized();
                var userId = Guid.Parse(userIdClaim);
                var user = await _db.Users.FindAsync(new object?[] { userId }, ct);
                if (user == null) return Unauthorized();
                if (string.IsNullOrEmpty(code.TargetEmail))
                    return BadRequest(new { message = "Change request is missing a target email." });
                // Race: someone else may have registered this email between send and verify.
                if (await _db.Users.AnyAsync(u => u.Email == code.TargetEmail, ct))
                    return BadRequest(new { message = "This email is already in use." });

                user.Email = code.TargetEmail;
                user.IsEmailVerified = true;
                user.EmailVerifiedAt = TimeZoneHelper.GetPakistanTime();
                await _db.SaveChangesAsync(ct);
                return Ok(new { message = "Email updated." });
            }

            return Ok(new { message = "Verified." });
        }
    }
}
