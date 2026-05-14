using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saffar.Api.Data;
using Saffar.Api.Models;
using Saffar.Api.DTOs;
using Saffar.Api.Services;
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

    var now = TimeZoneHelper.GetPakistanTime();

    // Total Earnings — sum TotalPrice from completed bookings (seats × price each)
    var totalEarnings = await _context.Bookings
        .Include(b => b.Ride)
        .Where(b =>
            b.Status == BookingStatus.Completed &&
            b.Ride.DriverId == driverId)
        .SumAsync(b => (decimal?)(b.TotalPrice > 0 ? b.TotalPrice : b.Ride.Price * b.SeatsBooked)) ?? 0;

    // Total Completed Rides count
    var totalAcceptedRides = await _context.Bookings
        .Include(b => b.Ride)
        .Where(b =>
            b.Status == BookingStatus.Completed &&
            b.Ride.DriverId == driverId)
        .Select(b => b.RideId)
        .Distinct()
        .CountAsync();

    // Monthly Earnings — same calculation, filtered to current month
    var monthlyEarnings = await _context.Bookings
        .Include(b => b.Ride)
        .Where(b =>
            b.Status == BookingStatus.Completed &&
            b.Ride.DriverId == driverId &&
            b.CreatedAt.Month == now.Month &&
            b.CreatedAt.Year == now.Year)
        .SumAsync(b => (decimal?)(b.TotalPrice > 0 ? b.TotalPrice : b.Ride.Price * b.SeatsBooked)) ?? 0;

    var result = new DriverEarningsDto
    {
        TotalEarnings = totalEarnings,
        TotalAcceptedRides = totalAcceptedRides,
        MonthlyEarnings = monthlyEarnings
    };

    return Ok(result);
}
// GET: api/users/driver-analytics
[HttpGet("driver-analytics")]
[Authorize(Roles = "Driver")]
public async Task<IActionResult> GetDriverAnalytics()
{
    var driverIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
    if (driverIdClaim == null) return Unauthorized();
    var driverId = Guid.Parse(driverIdClaim.Value);
    var now  = TimeZoneHelper.GetPakistanTime();
    var today = now.Date;

    // All completed bookings for this driver
    var bookings = await _context.Bookings
        .Include(b => b.Ride)
        .Where(b => b.Status == BookingStatus.Completed && b.Ride.DriverId == driverId)
        .ToListAsync();

    decimal Earn(Booking b) => b.TotalPrice > 0 ? b.TotalPrice : b.Ride.Price * b.SeatsBooked;

    decimal totalEarnings      = bookings.Sum(Earn);
    int     totalRides         = bookings.Select(b => b.RideId).Distinct().Count();
    decimal thisMonthEarnings  = bookings
        .Where(b => b.Ride.DepartureTime.Month == now.Month && b.Ride.DepartureTime.Year == now.Year)
        .Sum(Earn);
    // "Today" is the day the ride was actually completed (money earned),
    // not the day it was scheduled to depart. Filter by CompletedAt — set
    // by RideController.CompleteRide in PKT, same timezone as `today`.
    decimal todayEarnings = bookings
        .Where(b => b.Ride.CompletedAt.HasValue && b.Ride.CompletedAt.Value.Date == today)
        .Sum(Earn);

    // Last 30 days grouped by departure date
    var cutoff = today.AddDays(-29);
    var dailyData = bookings
        .Where(b => b.Ride.DepartureTime.Date >= cutoff)
        .GroupBy(b => b.Ride.DepartureTime.Date)
        .Select(g => new
        {
            date     = g.Key.ToString("dd MMM"),
            earnings = g.Sum(Earn)
        })
        .OrderBy(x => x.date)
        .ToList();

    // Last 5 completed rides with per-ride earnings
    var recentRides = bookings
        .GroupBy(b => b.RideId)
        .Select(g => new
        {
            fromAddress   = g.First().Ride.FromAddress,
            toAddress     = g.First().Ride.ToAddress,
            departureTime = g.First().Ride.DepartureTime,
            earnings      = g.Sum(Earn),
            passengers    = g.Count()
        })
        .OrderByDescending(r => r.departureTime)
        .Take(5)
        .ToList();

    return Ok(new
    {
        totalEarnings,
        totalRides,
        thisMonthEarnings,
        todayEarnings,
        dailyData,
        recentRides
    });
}

[HttpGet("driver/profile")]
[Authorize(Roles = "Driver")]
public IActionResult GetDriverProfile()
{
    var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    if (userIdClaim == null)
        return Unauthorized();

    var userId = Guid.Parse(userIdClaim);

    var user = _context.Users.FirstOrDefault(x => x.Id == userId);

    if (user == null)
        return NotFound();

    return Ok(new
    {
        fullName          = user.FullName,
        age               = user.Age,
        email             = user.Email,
        phoneNumber       = user.PhoneNumber,
        cnic              = user.CNIC,
        profileImageUrl   = user.ProfileImageUrl,
        cnicImageUrl      = user.CNICImageUrl,
        licenseImageUrl   = user.LicenseImageUrl,
        rating            = user.Rating,
        isProfileComplete = user.IsProfileComplete
    });
}
[HttpPut("driver/profile")]
[Authorize(Roles = "Driver")]
public async Task<IActionResult> UpdateDriverProfile([FromForm] CompleteProfileDto dto)
{
    var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (userId == null) return Unauthorized();

    var user = _context.Users.FirstOrDefault(u => u.Id.ToString() == userId);
    if (user == null) return NotFound();

    // Documents are managed exclusively via /api/profile/upload-documents
    user.FullName = dto.FullName;
    user.Age      = dto.Age;

    await _context.SaveChangesAsync();

    return Ok(new { message = "Profile updated successfully" });
}
[Authorize(Roles = "Admin")]
[HttpGet("admin/pending-drivers")]
public IActionResult GetPendingDrivers()
{
    var drivers = _context.Users
        .Where(u => u.Role == "Driver" && !u.IsDriverApproved)
        .Select(u => new
        {
            u.Id,
            u.FullName,
            u.PhoneNumber,
            u.CNICImageUrl,
            u.LicenseImageUrl,
            u.VehicleName,
            u.VehicleNumber
        })
        .ToList();

    return Ok(drivers);
}
[Authorize(Roles = "Admin")]
[HttpPut("admin/approve-driver/{id}")]
public IActionResult ApproveDriver(Guid id)
{
    var user = _context.Users.FirstOrDefault(u => u.Id == id);

    if (user == null) return NotFound();

    user.IsDriverApproved = true;

    _context.SaveChanges();

    return Ok(new { message = "Driver approved successfully" });
}
[Authorize(Roles = "Passenger")]
[HttpGet("passenger/profile")]
public IActionResult GetPassengerProfile()
{
    var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (userId == null) return Unauthorized();

    var user = _context.Users.FirstOrDefault(u => u.Id.ToString() == userId);
    if (user == null) return NotFound();

    return Ok(new
    {
        fullName          = user.FullName,
        age               = user.Age,
        gender            = user.Gender,
        phoneNumber       = user.PhoneNumber,
        cnic              = user.CNIC,
        profileImageUrl   = user.ProfileImageUrl,
        cnicImageUrl      = user.CNICImageUrl,
        isProfileComplete = user.IsProfileComplete
    });
}

[Authorize(Roles = "Passenger")]
[HttpPost("passenger/profile")]
public async Task<IActionResult> CompletePassengerProfile([FromForm] PassengerProfileDto dto)
{
    var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (userId == null) return Unauthorized();

    var user = _context.Users.FirstOrDefault(x => x.Id.ToString() == userId);
    if (user == null) return NotFound();

    // Documents are managed exclusively via /api/profile/upload-documents
    user.Age    = dto.Age;
    user.Gender = dto.Gender;

    await _context.SaveChangesAsync();

    return Ok("Passenger profile updated");
}
    }
}