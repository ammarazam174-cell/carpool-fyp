using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Saffar.Api.Data;
using Saffar.Api.DTOs;
using Saffar.Api.Models;

namespace Saffar.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Driver")]
    public class VehicleController : ControllerBase
    {
        private readonly SaffarDbContext _context;

        public VehicleController(SaffarDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> AddVehicle(VehicleCreateDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var driverId = Guid.Parse(userId);
            var isFirst = !await _context.Vehicles.AnyAsync(v => v.OwnerId == driverId);

            var vehicle = new Vehicle
            {
                Id = Guid.NewGuid(),
                OwnerId = driverId,
                Make = dto.Make,
                Model = dto.Model,
                PlateNumber = dto.PlateNumber,
                Seats = dto.Seats,
                IsDefault = isFirst,
                CreatedAt = DateTime.UtcNow
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
    }
}
