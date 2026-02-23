using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saffar.Api.Data;
using Saffar.Api.Models;
using Saffar.Api.DTOs;
using System.Security.Claims;

namespace Saffar.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RidesController : ControllerBase
    {
        private readonly SaffarDbContext _context;

        public RidesController(SaffarDbContext context)
        {
            _context = context;
        }
        // -----------------------------------
        // GET: api/Rides
        // -----------------------------------
        // 1️⃣ Passenger – public rides list 
        [HttpGet]
[AllowAnonymous]
public async Task<IActionResult> GetRides()
{
    var rides = await _context.Rides
        .Include(r => r.Driver)
        .Include(r => r.Vehicle)
        .Include(r => r.RideStops)
        .Where(r => r.Status == "Active")
        .ToListAsync();

    var result = rides.Select(ride => new RideResponseDto
    {
        Id = ride.Id,
        FromAddress = ride.FromAddress,
        ToAddress = ride.ToAddress,
        DepartureTime = ride.DepartureTime,
        AvailableSeats = ride.AvailableSeats,
        Price = ride.Price,
        Status = ride.Status,

        DriverName = ride.Driver.FullName,
        DriverPhone = ride.Driver.PhoneNumber,

        VehicleMake = ride.Vehicle.Make,
        VehicleModel = ride.Vehicle.Model,

        PickupStops = ride.RideStops
            .Where(s => s.StopType == "Pickup")
            .Select(s => s.StopName)
            .ToList(),

        DropoffStops = ride.RideStops
            .Where(s => s.StopType == "Dropoff")
            .Select(s => s.StopName)
            .ToList()
    }).ToList();

    return Ok(result);
}
        // -----------------------------------
        // GET: api/Rides/{id}
        // -----------------------------------
        [HttpGet("{id}")]
        public async Task<IActionResult> GetRideById(Guid id)
        {
            var ride = await _context.Rides
                .Include(r => r.Driver)
                .Include(r => r.Vehicle)
                .Include(r => r.RideStops)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (ride == null)
                return NotFound("Ride not found");

            return Ok(ride);
        }

        // -----------------------------------
        // POST: api/Rides
        // DRIVER CREATES RIDE WITH ROUTES
        // -----------------------------------
        [Authorize(Roles = "Driver")]
[HttpPost]
public async Task<IActionResult> CreateRide(RideCreateDto dto)
{
    var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (userIdClaim == null)
        return Unauthorized();

    var driverId = Guid.Parse(userIdClaim);

    var driver = await _context.Users.FindAsync(driverId);
    if (driver == null)
        return Unauthorized();

    if (string.IsNullOrWhiteSpace(driver.FullName)
        || driver.Age <= 0
        || string.IsNullOrWhiteSpace(driver.ProfileImageUrl))
    {
        return BadRequest("Complete your profile before creating a ride.");
    }

    var vehicle = await _context.Vehicles
        .Where(v => v.OwnerId == driverId)
        .FirstOrDefaultAsync();

    if (vehicle == null)
        return BadRequest("Please add a vehicle before creating a ride");

    if (dto.DepartureTime <= DateTime.UtcNow)
        return BadRequest("Departure time must be in future.");

    if (dto.AvailableSeats <= 0 || dto.Price <= 0)
        return BadRequest("Seats and price must be greater than zero.");

    var ride = new Ride
    {
        Id = Guid.NewGuid(),
        DriverId = driverId,
        VehicleId = vehicle.Id,
        FromAddress = dto.FromAddress,
        ToAddress = dto.ToAddress,
        DepartureTime = dto.DepartureTime,
        AvailableSeats = dto.AvailableSeats,
        Price = dto.Price,
        Status = "Active",
        CreatedAt = DateTime.UtcNow
    };

    _context.Rides.Add(ride);
    await _context.SaveChangesAsync();

    dto.PickupStops ??= new List<string>();
    dto.DropoffStops ??= new List<string>();

    // ✅ SAVE STOPS ONLY ONCE
    for (int i = 0; i < dto.PickupStops.Count; i++)
    {
        _context.RideStops.Add(new RideStop
        {
            RideId = ride.Id,
            StopName = dto.PickupStops[i],
            StopType = "Pickup",
            StopOrder = i + 1
        });
    }

    for (int i = 0; i < dto.DropoffStops.Count; i++)
    {
        _context.RideStops.Add(new RideStop
        {
            RideId = ride.Id,
            StopName = dto.DropoffStops[i],
            StopType = "Dropoff",
            StopOrder = i + 1
        });
    }

    await _context.SaveChangesAsync();

    return Ok(new
    {
        message = "Ride created successfully",
        rideId = ride.Id
    });
}
        [Authorize(Roles = "Driver")]
    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> CancelRide(Guid id)
    {
    var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (userId == null)
        return Unauthorized();

    var driverId = Guid.Parse(userId);

    var ride = await _context.Rides
        .FirstOrDefaultAsync(r => r.Id == id && r.DriverId == driverId);

    if (ride == null)
        return NotFound("Ride not found");

    if (ride.Status == "Cancelled")
        return BadRequest("Ride already cancelled");

    ride.Status = "Cancelled";

    await _context.SaveChangesAsync();

    return Ok(new { message = "Ride cancelled successfully" });
    }

        // -----------------------------------
        // GET: api/Rides/search?pickup=PECHS
        // PASSENGER SEARCH (ROUTE-BASED)
        // -----------------------------------
        // GET: api/Rides/search
        [HttpGet("search")]
[AllowAnonymous]
public async Task<IActionResult> Search(string pickup, string toCity)
{
    try
    {
        if (string.IsNullOrWhiteSpace(pickup) || string.IsNullOrWhiteSpace(toCity))
            return BadRequest("Pickup and destination required");

        pickup = pickup.Trim().ToLower();
        toCity = toCity.Trim().ToLower();

        var rides = await _context.Rides
            .Include(r => r.Driver)
            .Include(r => r.Vehicle)
            .Include(r => r.RideStops)
            .Where(r =>
                r.FromAddress.ToLower().Contains(pickup) &&
                r.ToAddress.ToLower().Contains(toCity) &&
                r.Status == "Active"
            )
            .ToListAsync();
            var result = rides.Select(r => new RideResponseDto
{
    Id = r.Id,
    FromAddress = r.FromAddress,
    ToAddress = r.ToAddress,
    DepartureTime = r.DepartureTime,
    AvailableSeats = r.AvailableSeats,
    Price = r.Price,
    Status = r.Status,

    DriverName = r.Driver!.FullName,
    DriverPhone = r.Driver!.PhoneNumber,

    VehicleMake = r.Vehicle!.Make,
    VehicleModel = r.Vehicle!.Model,

    PickupStops = r.RideStops
        .Where(s => s.StopType == "Pickup")
        .Select(s => s.StopName)
        .ToList(),

    DropoffStops = r.RideStops
        .Where(s => s.StopType == "Dropoff")
        .Select(s => s.StopName)
        .ToList()
}).ToList();

return Ok(result);

    }
    catch (Exception ex)
    {
        return StatusCode(500, ex.ToString()); // 🔥 FULL ERROR SHOW
    }
}
[HttpGet("my")]
[Authorize(Roles = "Driver")]
public async Task<IActionResult> GetMyRides()
{
    var driverIdClaim = User.FindFirst("userId");

    if (driverIdClaim == null)
        return Unauthorized("Driver ID not found");

    var driverId = Guid.Parse(driverIdClaim.Value);

    var rides = await _context.Rides
        .Where(r => r.DriverId == driverId)
        .OrderByDescending(r => r.DepartureTime)
        .ToListAsync();

    return Ok(rides);
}
[HttpPut("{id}")]
[Authorize(Roles = "Driver")]
public async Task<IActionResult> UpdateRide(Guid id, RideUpdateDto dto)
{
    var driverIdClaim = User.FindFirst("userId");

    if (driverIdClaim == null)
        return Unauthorized("Driver ID not found in token");

    var driverId = Guid.Parse(driverIdClaim.Value);

    var ride = await _context.Rides
        .Include(r => r.Bookings)
        .FirstOrDefaultAsync(r => r.Id == id);

    if (ride == null)
        return NotFound("Ride not found");

    // 🔐 Security: Only ride owner can edit
    if (ride.DriverId != driverId)
        return Forbid("You can only edit your own ride");

    // 🚫 Block update if bookings exist
    if (ride.Bookings.Any())
        return BadRequest("Cannot edit ride after bookings have been made");

    // ✅ Update fields
    ride.DepartureTime = dto.DepartureTime;
    ride.Price = dto.Price;
    ride.AvailableSeats = dto.AvailableSeats;

    await _context.SaveChangesAsync();

    return Ok("Ride updated successfully");
}
[Authorize(Roles = "Driver")]
[HttpPut("{id}/complete")]
public async Task<IActionResult> CompleteRide(Guid id)
{
    var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    if (userId == null)
        return Unauthorized();

    var driverId = Guid.Parse(userId);

    var ride = await _context.Rides
        .FirstOrDefaultAsync(r => r.Id == id && r.DriverId == driverId);

    if (ride == null)
        return NotFound("Ride not found");

    if (ride.Status == "Completed")
        return BadRequest("Ride already completed");

    if (ride.Status == "Cancelled")
        return BadRequest("Cannot complete cancelled ride");

    ride.Status = "Completed";

await _context.SaveChangesAsync();

// Get accepted bookings
var completedBookings = await _context.Bookings
    .Where(b => b.RideId == ride.Id && b.Status == "Accepted")
    .ToListAsync();

decimal totalEarning = completedBookings.Sum(b => ride.Price);

// Get driver
var driver = await _context.Users.FindAsync(driverId);
Console.WriteLine("DEBUG STARTED");

if (driver != null)
{
    driver.Earnings += totalEarning;
    await _context.SaveChangesAsync();
}

return Ok(new
{
    message = "Ride completed successfully"
});
}
[Authorize(Roles = "Passenger")]
[HttpPost("{id}/rate")]
public async Task<IActionResult> RateDriver(Guid id, [FromBody] int stars)
{
    if (stars < 1 || stars > 5)
        return BadRequest("Rating must be between 1 and 5");

    var passengerId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    var ride = await _context.Rides.FindAsync(id);

    if (ride == null)
        return NotFound("Ride not found");

    if (ride.Status != "Completed")
        return BadRequest("You can only rate completed rides");

    var alreadyRated = await _context.Ratings
        .AnyAsync(r => r.RideId == id && r.PassengerId == passengerId);

    if (alreadyRated)
        return BadRequest("You already rated this ride");

    var rating = new Rating
    {
        RideId = id,
        DriverId = ride.DriverId,
        PassengerId = passengerId,
        Stars = stars
    };

    _context.Ratings.Add(rating);

    // 🔥 Recalculate driver average
    var driverRatings = await _context.Ratings
        .Where(r => r.DriverId == ride.DriverId)
        .ToListAsync();

    var driver = await _context.Users.FindAsync(ride.DriverId);

    if (driver != null)
    {
        driver.Rating = driverRatings.Average(r => r.Stars);
    }

    await _context.SaveChangesAsync();

    return Ok("Driver rated successfully");
}
    }
}