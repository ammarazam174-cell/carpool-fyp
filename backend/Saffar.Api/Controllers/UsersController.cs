using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saffar.Api.Data;
using Saffar.Api.Models;
using Saffar.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Saffar.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly SaffarDbContext _context;

        public UsersController(SaffarDbContext context)
        {
            _context = context;
        }

        // GET: api/users
        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users.ToListAsync();
            return Ok(users);
        }

        // GET: api/users/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound();

            return Ok(user);
        }

        // POST: api/users
        [HttpPost]
        public async Task<IActionResult> CreateUser(User user)
        {
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
        }
        // GET: api/users/driver/earnings
        [HttpGet("driver/earnings")]
[Authorize(Roles = "Driver")]
public async Task<IActionResult> GetDriverEarnings()
{
    var driverIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

    if (driverIdClaim == null)
        return Unauthorized("Driver ID not found in token");

    var driverId = Guid.Parse(driverIdClaim.Value);

    var now = DateTime.UtcNow;

    // ✅ Total Earnings
    var totalEarnings = await _context.Bookings
        .Include(b => b.Ride)
        .Where(b =>
            b.Status == "Accepted" &&
            b.Ride.DriverId == driverId)
        .SumAsync(b => (decimal?)b.Ride.Price) ?? 0;

    // ✅ Total Accepted Rides
    var totalAcceptedRides = await _context.Bookings
        .Include(b => b.Ride)
        .Where(b =>
            b.Status == "Accepted" &&
            b.Ride.DriverId == driverId)
        .Select(b => b.RideId)
        .Distinct()
        .CountAsync();

    // ✅ Monthly Earnings
    var monthlyEarnings = await _context.Bookings
        .Include(b => b.Ride)
        .Where(b =>
            b.Status == "Accepted" &&
            b.Ride.DriverId == driverId &&
            b.CreatedAt.Month == now.Month &&
            b.CreatedAt.Year == now.Year)
        .SumAsync(b => (decimal?)b.Ride.Price) ?? 0;

    var result = new DriverEarningsDto
    {
        TotalEarnings = totalEarnings,
        TotalAcceptedRides = totalAcceptedRides,
        MonthlyEarnings = monthlyEarnings
    };

    return Ok(result);
}
[Authorize(Roles = "Driver")]
[HttpGet("driver/profile")]
public async Task<IActionResult> GetDriverProfile()
{
    var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    if (userId == null)
        return Unauthorized();

    var driver = await _context.Users.FindAsync(Guid.Parse(userId));

    if (driver == null)
        return NotFound();

    var profile = new DriverProfileResponseDto
{
    FullName = driver.FullName ?? "",
    Age = driver.Age,
    PhoneNumber = driver.PhoneNumber,
    ProfileImageUrl = driver.ProfileImageUrl,
    Rating = driver.Rating,
};

    return Ok(profile);
}
[HttpPut("driver/profile")]
[Authorize(Roles = "Driver")]
public async Task<IActionResult> UpdateDriverProfile(
    [FromForm] DriverProfileDto dto)
{
    var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    var user = await _context.Users.FindAsync(userId);

    if (user == null)
        return NotFound();

    user.FullName = dto.FullName;
    user.Age = dto.Age;

    if (dto.ProfileImage != null)
    {
        var fileName = Guid.NewGuid() + Path.GetExtension(dto.ProfileImage.FileName);
        var filePath = Path.Combine("wwwroot/uploads", fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await dto.ProfileImage.CopyToAsync(stream);
        }

        user.ProfileImageUrl = "/uploads/" + fileName;
    }

    await _context.SaveChangesAsync();

    user.IsProfileComplete = 
    !string.IsNullOrWhiteSpace(user.FullName)
    && user.Age > 0
    && !string.IsNullOrWhiteSpace(user.ProfileImageUrl);

    return Ok(user);
}
    }
}