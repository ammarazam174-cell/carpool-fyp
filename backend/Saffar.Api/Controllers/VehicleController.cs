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
        if (userId == null)
            return Unauthorized();

        var vehicle = new Vehicle
        {
            Id = Guid.NewGuid(),
            OwnerId = Guid.Parse(userId),
            Make = dto.Make,
            Model = dto.Model,
            PlateNumber = dto.PlateNumber,
            Seats = dto.Seats,
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
        if (userId == null)
            return Unauthorized();

        var driverId = Guid.Parse(userId);

        var vehicles = await _context.Vehicles
            .Where(v => v.OwnerId == driverId)
            .ToListAsync();

        return Ok(vehicles);
    }
}
}