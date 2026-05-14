using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Saffar.Api.Data;
using Saffar.Api.Models;
using Saffar.Api.DTOs;
using Saffar.Api.Hubs;
using Saffar.Api.Services;
using System.Security.Claims;

namespace Saffar.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RidesController : ControllerBase
    {
        private readonly SaffarDbContext _context;
        private readonly IHubContext<BookingHub> _hub;

        public RidesController(SaffarDbContext context, IHubContext<BookingHub> hub)
        {
            _context = context;
            _hub = hub;
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
        .Where(r => r.Status == "Active" || r.Status == "InProgress")
        .ToListAsync();

    var passengerBookings = await GetPassengerBookingMap(rides.Select(r => r.Id).ToList());

    var result = rides.Select(ride => new RideResponseDto
    {
        Id = ride.Id,
        FromAddress = ride.FromAddress,
        ToAddress = ride.ToAddress,
        DepartureTime = ride.DepartureTime,
        TotalSeats = ride.TotalSeats,
        AvailableSeats = ride.AvailableSeats,
        Price = ride.Price,
        Status = ride.Status,

        DriverName = ride.Driver?.FullName ?? "",
        DriverPhone = ride.Driver?.PhoneNumber ?? "",

        VehicleMake = ride.Vehicle?.Make ?? "",
        VehicleModel = ride.Vehicle?.Model ?? "",

        PickupStops = ride.RideStops
            .Where(s => s.StopType == "Pickup")
            .Select(s => s.StopName)
            .ToList(),

        DropoffStops = ride.RideStops
            .Where(s => s.StopType == "Dropoff")
            .Select(s => s.StopName)
            .ToList(),

        HasRequested = passengerBookings.ContainsKey(ride.Id),
        BookingStatus = passengerBookings.TryGetValue(ride.Id, out var bs) ? bs.ToString() : null
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

// 🔥 ADMIN APPROVAL CHECK
if (!driver.IsDriverApproved)
    return BadRequest("Driver not approved by admin");

// Profile completeness check
if (string.IsNullOrWhiteSpace(driver.FullName)
    || string.IsNullOrWhiteSpace(driver.ProfileImageUrl))
{
    return BadRequest("Complete your profile before creating a ride");
}

    var vehicle = await _context.Vehicles
        .Where(v => v.OwnerId == driverId)
        .FirstOrDefaultAsync();

    if (vehicle == null)
        return BadRequest("Please add a vehicle before creating a ride");

    if (dto.DepartureTime <= TimeZoneHelper.GetPakistanTime())
        return BadRequest("Departure time must be in future.");

    if (dto.AvailableSeats <= 0)
        return BadRequest("Available seats must be greater than zero.");

    // Fare is set automatically by the system — not accepted from client
    decimal fare = ResolveFare(dto.FromAddress, dto.ToAddress);

    var ride = new Ride
    {
        Id = Guid.NewGuid(),
        DriverId = driverId,
        VehicleId = vehicle.Id,
        FromAddress = dto.FromAddress,
        ToAddress = dto.ToAddress,
        PickupLocation = dto.PickupLocation,
        DepartureTime = dto.DepartureTime,
        TotalSeats = dto.AvailableSeats,
        AvailableSeats = dto.AvailableSeats,
        Price = fare,
        Status = "Active",
        CreatedAt = TimeZoneHelper.GetPakistanTime()
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
                (r.Status == "Active" || r.Status == "InProgress")
            )
            .ToListAsync();

        var passengerBookings = await GetPassengerBookingMap(rides.Select(r => r.Id).ToList());

        var result = rides.Select(r => new RideResponseDto
        {
            Id = r.Id,
            DriverId = r.DriverId,
            FromAddress = r.FromAddress,
            ToAddress = r.ToAddress,
            DepartureTime = DateTime.SpecifyKind(r.DepartureTime, DateTimeKind.Utc),
            TotalSeats = r.TotalSeats,
            AvailableSeats = r.AvailableSeats,
            Price = r.Price,
            Status = r.Status,

            DriverName = r.Driver?.FullName ?? "",
            DriverPhone = r.Driver?.PhoneNumber ?? "",

            VehicleMake = r.Vehicle?.Make ?? "",
            VehicleModel = r.Vehicle?.Model ?? "",

            PickupStops = r.RideStops
                .Where(s => s.StopType == "Pickup")
                .Select(s => s.StopName)
                .ToList(),

            DropoffStops = r.RideStops
                .Where(s => s.StopType == "Dropoff")
                .Select(s => s.StopName)
                .ToList(),

            HasRequested = passengerBookings.ContainsKey(r.Id),
            BookingStatus = passengerBookings.TryGetValue(r.Id, out var bs) ? bs.ToString() : null
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
    var driverIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
    if (driverIdClaim == null) return Unauthorized("Driver ID not found");

    var driverId = Guid.Parse(driverIdClaim.Value);

    var rides = await _context.Rides
        .Where(r => r.DriverId == driverId)
        .OrderByDescending(r => r.DepartureTime)
        .Select(r => new {
            r.Id,
            r.FromAddress,
            r.ToAddress,
            r.PickupLocation,
            r.DepartureTime,
            r.TotalSeats,
            r.AvailableSeats,
            r.Price,
            r.Status,
            r.DriverLat,
            r.DriverLng,
            r.DriverLocationUpdatedAt,
            acceptedCount = r.Bookings.Count(b => b.Status == BookingStatus.Accepted || b.Status == BookingStatus.Completed),
            passengers = r.Bookings
                .Where(b => b.Status == BookingStatus.Accepted || b.Status == BookingStatus.Completed)
                .Select(b => new {
                    id            = b.Id,
                    fullName      = b.Passenger.FullName ?? "Unknown",
                    phoneNumber   = b.Passenger.PhoneNumber,
                    seatsBooked   = b.SeatsBooked,
                    pickupStop    = b.PickupStop,
                    passengerAddress = b.PassengerAddress,
                    totalPrice    = b.TotalPrice > 0 ? b.TotalPrice : r.Price * b.SeatsBooked
                }).ToList()
        })
        .ToListAsync();

    return Ok(rides);
}

// PUT: /api/rides/{id}/start  — driver starts the ride
[HttpPut("{id}/start")]
[Authorize(Roles = "Driver")]
public async Task<IActionResult> StartRide(Guid id)
{
    var driverId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    var ride = await _context.Rides
        .FirstOrDefaultAsync(r => r.Id == id && r.DriverId == driverId);

    if (ride == null) return NotFound("Ride not found");
    if (ride.Status == "InProgress") return Ok(new { message = "Already started" });
    if (ride.Status != "Active") return BadRequest("Ride cannot be started in its current state");

    var acceptedCount = await _context.Bookings
        .CountAsync(b => b.RideId == id && b.Status == BookingStatus.Accepted);

    if (acceptedCount == 0)
        return BadRequest("Cannot start ride without at least one accepted passenger");

    ride.Status = "InProgress";
    await _context.SaveChangesAsync();

    return Ok(new { message = "Ride started" });
}

// PUT: /api/rides/{id}/location  — driver sends live GPS
[HttpPut("{id}/location")]
[Authorize(Roles = "Driver")]
public async Task<IActionResult> UpdateDriverLocation(Guid id, [FromBody] DriverLocationDto dto)
{
    var driverId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    var ride = await _context.Rides
        .FirstOrDefaultAsync(r => r.Id == id && r.DriverId == driverId);

    if (ride == null) return NotFound();
    if (ride.Status != "InProgress") return BadRequest("Ride not in progress");

    ride.DriverLat = dto.Lat;
    ride.DriverLng = dto.Lng;
    ride.DriverLocationUpdatedAt = TimeZoneHelper.GetPakistanTime();

    await _context.SaveChangesAsync();

    await _hub.Clients.All.SendAsync("DriverLocationUpdated", new
    {
        rideId = id.ToString(),
        lat    = dto.Lat,
        lng    = dto.Lng,
        updatedAt = TimeZoneHelper.GetPakistanTime()
    });

    return Ok();
}

// GET: /api/rides/{id}/location  — passenger polls driver location
[HttpGet("{id}/location")]
[Authorize]
public async Task<IActionResult> GetDriverLocation(Guid id)
{
    var ride = await _context.Rides
        .Where(r => r.Id == id)
        .Select(r => new {
            r.Status,
            r.DriverLat,
            r.DriverLng,
            r.DriverLocationUpdatedAt,
            r.PickupLocation
        })
        .FirstOrDefaultAsync();

    if (ride == null) return NotFound();

    return Ok(ride);
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
    ride.CompletedAt = TimeZoneHelper.GetPakistanTime();

    // Mark all accepted bookings as Completed
    var acceptedBookings = await _context.Bookings
        .Where(b => b.RideId == ride.Id && b.Status == BookingStatus.Accepted)
        .ToListAsync();

    foreach (var bk in acceptedBookings)
        bk.Status = BookingStatus.Completed;

await _context.SaveChangesAsync();

// Get accepted bookings (now marked Completed)
var completedBookings = acceptedBookings;

decimal totalEarning = completedBookings.Sum(b => b.TotalPrice > 0 ? b.TotalPrice : ride.Price * b.SeatsBooked);

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

    // Returns a map of rideId → latest booking status for the authenticated passenger.
    // Returns empty dict if the caller is not a passenger.
    private async Task<Dictionary<Guid, BookingStatus>> GetPassengerBookingMap(List<Guid> rideIds)
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (claim == null || rideIds.Count == 0)
            return new Dictionary<Guid, BookingStatus>();

        var passengerId = Guid.Parse(claim);

        var bookings = await _context.Bookings
            .Where(b => b.PassengerId == passengerId && rideIds.Contains(b.RideId))
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        // Keep only the most recent booking per ride
        return bookings
            .GroupBy(b => b.RideId)
            .ToDictionary(g => g.Key, g => g.First().Status);
    }

    // ── Fare table (admin-controlled) ──────────────────────────────────────────
    private static decimal ResolveFare(string from, string to)
    {
        var key = $"{from.Trim().ToLower()}→{to.Trim().ToLower()}";
        return key switch
        {
            "karachi→hyderabad" => 1200,
            "hyderabad→karachi" => 1200,
            _ => 1200   // default fare for any unlisted route
        };
    }
    }
}