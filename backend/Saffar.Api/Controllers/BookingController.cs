using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Saffar.Api.Data;
using Saffar.Api.Models;
using Saffar.Api.DTOs;
using Saffar.Api.Services;
using System.Security.Claims;

namespace Saffar.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingsController : ControllerBase
    {
        private readonly SaffarDbContext _context;
        private readonly PushNotificationService _push;
        public BookingsController(
    SaffarDbContext context,
    PushNotificationService push)
{
    _context = context;
    _push = push;
}
        // -----------------------------------
        // GET: api/Bookings (ADMIN / DEBUG)
        // -----------------------------------
        [HttpGet]
        public async Task<IActionResult> GetAllBookings()
        {
            var bookings = await _context.Bookings
                .Include(b => b.Ride)
                .Include(b => b.Passenger)
                .ToListAsync();

            return Ok(bookings);
        }

        // -----------------------------------
        // GET: api/Bookings/{id}
        // -----------------------------------
        [HttpGet("{id}")]
        public async Task<IActionResult> GetBookingById(Guid id)
        {
            var booking = await _context.Bookings
                .Include(b => b.Ride)
                .Include(b => b.Passenger)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null)
                return NotFound("Booking not found");

            return Ok(booking);
        }

        // -----------------------------------
        // POST: api/Bookings
        // PASSENGER REQUESTS BOOKING
        // -----------------------------------
        [Authorize(Roles = "Passenger")]
[HttpPost]
public async Task<IActionResult> CreateBooking(CreateBookingDto dto)
{
    var passengerIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (passengerIdStr == null)
        return Unauthorized();

    var passengerId = Guid.Parse(passengerIdStr);

    var ride = await _context.Rides.FindAsync(dto.RideId);
    if (ride == null)
        return NotFound("Ride not found");

    if (ride.AvailableSeats < dto.Seats)
        return BadRequest("Not enough seats available");

    var alreadyBooked = await _context.Bookings.AnyAsync(b =>
        b.RideId == dto.RideId &&
        b.PassengerId == passengerId);

    if (alreadyBooked)
        return BadRequest("You already requested this ride");

    var booking = new Booking
    {
        RideId = dto.RideId,
        PassengerId = passengerId,   // ✅ FIXED
        SeatsBooked = dto.Seats,
        PickupStop = dto.PickupStop,
        DropoffStop = dto.DropoffStop,
        Status = "Pending",
        CreatedAt = DateTime.UtcNow
    };

    ride.AvailableSeats -= dto.Seats;

    _context.Bookings.Add(booking);
    await _context.SaveChangesAsync();

    return Ok(new
    {
        message = "Booking request sent successfully",
        bookingId = booking.Id,
        pickupStop = booking.PickupStop,   // ✅ If you want to return it
        dropoffStop = booking.DropoffStop
    });
}

        // -----------------------------------
        // GET: api/Bookings/driver/{driverId}
        // DRIVER VIEWS BOOKING REQUESTS
        // -----------------------------------
        [Authorize(Roles = "Driver")]
        [HttpGet("driver/{driverId}")]
        public async Task<IActionResult> GetDriverBookings(Guid driverId)
        {
            var bookings = await _context.Bookings
                .Include(b => b.Ride)
                .Include(b => b.Passenger)
                .Where(b => b.Ride.DriverId == driverId)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            return Ok(bookings);
        }

        // -----------------------------------
        // PUT: api/Bookings/{id}/accept
        // DRIVER ACCEPTS BOOKING
        // -----------------------------------
        [Authorize(Roles = "Driver")]
[HttpPut("{id}/accept")]
public async Task<IActionResult> AcceptBooking(Guid id)
{
    var driverIdClaim = User.FindFirst("userId");

    
    if (driverIdClaim == null)
        return Unauthorized("Driver ID not found");

    var driverId = Guid.Parse(driverIdClaim.Value);

    var booking = await _context.Bookings
        .Include(b => b.Ride)
        .FirstOrDefaultAsync(b =>
            b.Id == id &&
            b.Ride.DriverId == driverId);

    if (booking == null)
        return NotFound("Booking not found");

    if (booking.Status != "Pending")
        return BadRequest("Booking already processed");

    if (booking.Ride.AvailableSeats <= 0)
        return BadRequest("Ride is full");

    booking.Status = "Accepted";
    booking.Ride.AvailableSeats--;

    await _context.SaveChangesAsync();

    var notification = await _context.UserNotifications
        .FirstOrDefaultAsync(x => x.UserId == booking.PassengerId);

    if (notification != null)
    {
        await _push.SendAsync(
            notification.FcmToken,
            "Booking Accepted ✅",
            "Driver has accepted your booking"
        );
    }

    return Ok(new { message = "Booking accepted" });
}

        // -----------------------------------
        // PUT: api/Bookings/{id}/reject
        // DRIVER REJECTS BOOKING
        // -----------------------------------
        [Authorize(Roles = "Driver")]
[HttpPut("{id}/reject")]
public async Task<IActionResult> RejectBooking(Guid id)
{
    var driverIdClaim = User.FindFirst("userId");

if (driverIdClaim == null)
    return Unauthorized();

var driverId = Guid.Parse(driverIdClaim.Value);

     var booking = await _context.Bookings
        .Include(b => b.Ride)
        .FirstOrDefaultAsync(b =>
            b.Id == id &&
            b.Ride.DriverId == driverId);

    if (booking == null)
        return NotFound("Booking not found");

    if (booking.Status != "Pending")
        return BadRequest("Booking already processed");

    booking.Status = "Rejected";
    await _context.SaveChangesAsync();

    var notification = await _context.UserNotifications
        .FirstOrDefaultAsync(x => x.UserId == booking.PassengerId);

    if (notification != null)
    {
        await _push.SendAsync(
            notification.FcmToken,
            "Booking Rejected ❌",
            "Driver has rejected your booking"
        );
    }

    return Ok(new { message = "Booking rejected" });
}
// GET: api/bookings/driver/my
[Authorize(Roles = "Driver")]
[HttpGet("driver/my")]
public async Task<IActionResult> GetDriverBookings()
{
    var driverIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

    if (driverIdClaim == null)
        return Unauthorized("UserId claim missing");

    var driverId = Guid.Parse(driverIdClaim.Value);

    var bookings = await _context.Bookings
    .Include(b => b.Ride)
    .Include(b => b.Passenger)   // 🔥 THIS WAS MISSING
    .Where(b => b.Ride.DriverId == driverId)
    .OrderByDescending(b => b.CreatedAt)
    .ToListAsync();

    return Ok(bookings);
}


        // -----------------------------------
        // PUT: api/Bookings/{id}/cancel
        // PASSENGER CANCELS (OPTIONAL)
        // -----------------------------------
        [Authorize(Roles = "Passenger")]
[HttpPut("{id}/cancel")]
public async Task<IActionResult> CancelBooking(Guid id)
{
    var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

    if (userIdClaim == null)
        return Unauthorized("UserId claim missing");

    var passengerId = Guid.Parse(userIdClaim.Value);

    var booking = await _context.Bookings
        .Include(b => b.Ride)
        .FirstOrDefaultAsync(b => b.Id == id && b.PassengerId == passengerId);

    if (booking == null)
        return NotFound("Booking not found");

    // ❌ Already processed
    if (booking.Status != "Accepted")
        return BadRequest("Only accepted bookings can be cancelled");

    // 🚫 NEW RULE → Cannot cancel after ride started
    if (booking.Ride.DepartureTime <= DateTime.UtcNow)
        return BadRequest("Ride already started. Cancellation not allowed.");

    // ✅ Refund seat
    booking.Ride.AvailableSeats += 1;

    booking.Status = "Cancelled";

    await _context.SaveChangesAsync();

    return Ok("Booking cancelled successfully");
}
        // -----------------------------------
// GET: api/Bookings/passenger/{passengerId}
// PASSENGER VIEWS HIS BOOKINGS
// -----------------------------------
[Authorize(Roles = "Passenger")]
[HttpGet("passenger/{passengerId}")]
public async Task<IActionResult> GetPassengerBookings(Guid passengerId)
{
    var bookings = await _context.Bookings
        .Include(b => b.Ride)
        .Where(b => b.PassengerId == passengerId)
        .OrderByDescending(b => b.CreatedAt)
        .ToListAsync();

    return Ok(bookings);
}
// GET: api/Bookings/my
[Authorize(Roles = "Passenger")]
[HttpGet("my")]
public async Task<IActionResult> GetMyBookings([FromQuery] string? status)
{
    var passengerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

    if (passengerIdClaim == null)
        return Unauthorized("UserId claim missing");

    var passengerId = Guid.Parse(passengerIdClaim.Value);

    var query = _context.Bookings
        .Include(b => b.Ride)
        .ThenInclude(r => r.Driver)
        .Where(b => b.PassengerId == passengerId);

    if (!string.IsNullOrEmpty(status))
    {
        query = query.Where(b => b.Status == status);
    }

    var bookings = await query
        .OrderByDescending(b => b.CreatedAt) // ⚠ use correct column name
        .Select(b => new
        {
            b.Id,
            b.Status,
            b.PickupStop,
            b.DropoffStop,
            Ride = new
            {
                b.Ride.FromAddress,
                b.Ride.ToAddress,
                b.Ride.DepartureTime
            },
            Driver = new
            {
                b.Ride.Driver.FullName,
                b.Ride.Driver.PhoneNumber
            }
        })
        .ToListAsync();

    return Ok(bookings);
}
    }
}