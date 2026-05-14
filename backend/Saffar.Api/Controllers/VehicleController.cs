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
    [Route("api/[controller]")]
    [Authorize(Roles = "Driver")]
    public class VehicleController : ControllerBase
    {
        private static readonly string[] AllowedExts = { ".jpg", ".jpeg", ".png", ".pdf" };
        private const long MaxBytes = 5 * 1024 * 1024; // 5 MB

        private readonly SaffarDbContext _context;

        public VehicleController(SaffarDbContext context)
        {
            _context = context;
        }

        public class VehicleCreateForm
        {
            public string Make { get; set; } = null!;
            public string Model { get; set; } = null!;
            public string PlateNumber { get; set; } = null!;
            public int Seats { get; set; }
            public IFormFile? RegistrationDoc { get; set; }
        }

        [HttpPost]
        [Consumes("multipart/form-data", "application/json")]
        public async Task<IActionResult> AddVehicle([FromForm] VehicleCreateForm dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var driverId = Guid.Parse(userId);

            if (string.IsNullOrWhiteSpace(dto.Make) || string.IsNullOrWhiteSpace(dto.Model)
                || string.IsNullOrWhiteSpace(dto.PlateNumber) || dto.Seats < 1)
            {
                return BadRequest(new { message = "Make, model, plate, and seats are all required." });
            }

            string? registrationDocUrl = null;
            if (dto.RegistrationDoc != null)
            {
                var err = ValidateFile(dto.RegistrationDoc);
                if (err != null) return BadRequest(new { message = err });
                registrationDocUrl = SaveFile(dto.RegistrationDoc, "vehicles");
            }

            var isFirst = !await _context.Vehicles.AnyAsync(v => v.OwnerId == driverId);

            var vehicle = new Vehicle
            {
                Id = Guid.NewGuid(),
                OwnerId = driverId,
                Make = dto.Make.Trim(),
                Model = dto.Model.Trim(),
                PlateNumber = dto.PlateNumber.Trim().ToUpperInvariant(),
                Seats = dto.Seats,
                IsDefault = isFirst,
                CreatedAt = TimeZoneHelper.GetPakistanTime(),
                RegistrationDocUrl = registrationDocUrl,
                IsVerified = false,
                VerifiedAt = null,
                RejectionReason = null
            };

            _context.Vehicles.Add(vehicle);
            await _context.SaveChangesAsync();

            return Ok(vehicle);
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMyVehicles()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var driverId = Guid.Parse(userId);

            var vehicles = await _context.Vehicles
                .Where(v => v.OwnerId == driverId)
                .OrderByDescending(v => v.IsDefault)
                .ThenBy(v => v.CreatedAt)
                .ToListAsync();

            return Ok(vehicles);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVehicle(Guid id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var driverId = Guid.Parse(userId);
            var vehicle = await _context.Vehicles
                .FirstOrDefaultAsync(v => v.Id == id && v.OwnerId == driverId);

            if (vehicle == null) return NotFound();

            var hasRides = await _context.Rides.AnyAsync(r => r.VehicleId == id);
            if (hasRides)
                return BadRequest(new { message = "Cannot delete a vehicle that has rides assigned to it." });

            _context.Vehicles.Remove(vehicle);
            await _context.SaveChangesAsync();

            if (vehicle.IsDefault)
            {
                var next = await _context.Vehicles
                    .Where(v => v.OwnerId == driverId)
                    .OrderBy(v => v.CreatedAt)
                    .FirstOrDefaultAsync();

                if (next != null)
                {
                    next.IsDefault = true;
                    await _context.SaveChangesAsync();
                }
            }

            return Ok(new { message = "Vehicle deleted" });
        }

        [HttpPatch("{id}/default")]
        public async Task<IActionResult> SetDefaultVehicle(Guid id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var driverId = Guid.Parse(userId);
            var vehicle = await _context.Vehicles
                .FirstOrDefaultAsync(v => v.Id == id && v.OwnerId == driverId);

            if (vehicle == null) return NotFound();

            var all = await _context.Vehicles
                .Where(v => v.OwnerId == driverId)
                .ToListAsync();

            foreach (var v in all) v.IsDefault = false;
            vehicle.IsDefault = true;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Default vehicle updated" });
        }

        // ── helpers ────────────────────────────────────────────────────────

        private static string? ValidateFile(IFormFile file)
        {
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExts.Contains(ext))
                return $"'{file.FileName}': only jpg, png, pdf allowed.";
            if (file.Length > MaxBytes)
                return $"'{file.FileName}': max size is 5 MB.";
            return null;
        }

        private static string SaveFile(IFormFile file, string folder)
        {
            var dir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", folder);
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            var name = Guid.NewGuid() + Path.GetExtension(file.FileName).ToLowerInvariant();
            using var stream = new FileStream(Path.Combine(dir, name), FileMode.Create);
            file.CopyTo(stream);
            return $"/uploads/{folder}/{name}";
        }
    }
}
