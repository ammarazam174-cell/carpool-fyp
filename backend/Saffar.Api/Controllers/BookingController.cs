using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Saffar.Api.Data;
using Saffar.Api.Models;
using Saffar.Api.DTOs;
using Saffar.Api.Services;
using Saffar.Api.Hubs;
using System.Security.Claims;

namespace Saffar.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingsController : ControllerBase
    {
        private readonly SaffarDbContext _context;
        private readonly PushNotificationService _push;
        private readonly IHubContext<BookingHub> _hub;
        private readonly IWalletService _wallet;
        private readonly ILogger<BookingsController> _logger;

        public BookingsController(
            SaffarDbContext context,
            PushNotificationService push,
            IHubContext<BookingHub> hub,
            IWalletService wallet,
            ILogger<BookingsController> logger)
        {
            _context = context;
            _push = push;
            _hub = hub;
            _wallet = wallet;
            _logger = logger;
        }

        private async Task BroadcastBookingUpdate(Guid bookingId, Guid rideId, Guid passengerId, string status)
        {
            await _hub.Clients.All.SendAsync("BookingUpdated", new
            {
                bookingId,
                rideId,
                passengerId,
                status
            });
        }

        private async Task BroadcastSeatsUpdated(Guid rideId, int availableSeats, int totalSeats)
        {
            await _hub.Clients.All.SendAsync("RideSeatsUpdated", new
            {
                rideId,
                availableSeats,
                totalSeats
            });
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

    // Block unverified passengers
    var passenger = await _context.Users.FindAsync(passengerId);
    if (passenger == null) return Unauthorized();
    if (!passenger.IsVerified)
        return BadRequest(new { message = "Your profile is pending admin approval. You cannot book rides yet." });

    var ride = await _context.Rides.FindAsync(dto.RideId);
    if (ride == null)
        return NotFound("Ride not found");

    if (ride.Status != "Active")
        return BadRequest("Ride is not available for booking");

    if (dto.Seats <= 0)
        return BadRequest("Invalid seat count");

    if (dto.Seats > ride.AvailableSeats)
        return BadRequest($"Only {ride.AvailableSeats} seat{(ride.AvailableSeats == 1 ? "" : "s")} available");

    var existingBooking = await _context.Bookings
        .Where(b => b.RideId == dto.RideId && b.PassengerId == passengerId)
        .OrderByDescending(b => b.CreatedAt)
        .FirstOrDefaultAsync();

    if (existingBooking != null &&
        (existingBooking.Status == BookingStatus.Pending || existingBooking.Status == BookingStatus.Accepted))
        return BadRequest("You already requested this ride");

    // 💰 Wallet top-up is optional. We attempt to settle through the wallet
    //    when the passenger has enough balance, but we don't block the booking
    //    on insufficient funds — payment is deferred / handled out of band.
    var totalPrice = ride.Price * dto.Seats;

    var booking = new Booking
    {
        RideId = dto.RideId,
        PassengerId = passengerId,
        SeatsBooked = dto.Seats,
        TotalPrice = totalPrice,
        PickupStop = dto.PickupStop,
        DropoffStop = dto.DropoffStop,
        PassengerLatitude = dto.PassengerLatitude,
        PassengerLongitude = dto.PassengerLongitude,
        PassengerAddress = dto.PassengerAddress,
        Status = BookingStatus.Pending,
        CreatedAt = TimeZoneHelper.GetPakistanTime()
    };

    ride.AvailableSeats -= dto.Seats;

    _context.Bookings.Add(booking);
    await _context.SaveChangesAsync();

    // 💰 Best-effort wallet settlement. If the passenger has enough balance,
    //    funds move passenger → driver. If not (or the gateway hiccups),
    //    we log it and let the booking stand — wallet is optional.
    var passengerWallet = await _wallet.GetWalletAsync(passengerId);
    if (passengerWallet.Balance >= totalPrice)
    {
        var payment = await _wallet.ProcessRidePaymentAsync(
            passengerId, ride.DriverId, booking.Id, totalPrice);

        if (!payment.Success)
        {
            _logger.LogWarning("Booking {BookingId}: wallet payment failed but booking kept — {Error}",
                booking.Id, payment.Error);
        }
    }
    else
    {
        _logger.LogInformation("Booking {BookingId}: wallet payment skipped — balance {Balance} < required {Required}",
            booking.Id, passengerWallet.Balance, totalPrice);
    }

    await _hub.Clients.All.SendAsync("NewBookingRequest", new
    {
        bookingId = booking.Id,
        rideId    = booking.RideId
    });

    await BroadcastSeatsUpdated(ride.Id, ride.AvailableSeats, ride.TotalSeats);

    return Ok(new
    {
        message = "Booking request sent successfully",
        bookingId = booking.Id,
        pickupStop = booking.PickupStop,
        dropoffStop = booking.DropoffStop,
        passengerAddress = booking.PassengerAddress,
        passengerLatitude = booking.PassengerLatitude,
        passengerLongitude = booking.PassengerLongitude
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

    if (booking.Status != BookingStatus.Pending)
        return BadRequest("Booking already processed");

    // Seats were already reserved when the passenger booked — no decrement needed here.
    // Just confirm the reservation by changing status.
    booking.Status = BookingStatus.Accepted;

    await _context.SaveChangesAsync();

    await BroadcastBookingUpdate(booking.Id, booking.RideId, booking.PassengerId, "Accepted");

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

    if (booking.Status != BookingStatus.Pending)
        return BadRequest("Booking already processed");

    booking.Status = BookingStatus.Rejected;
    // Refund the seats that were reserved at booking time
    booking.Ride.AvailableSeats += booking.SeatsBooked;

    await _context.SaveChangesAsync();

    // 💰 Refund the passenger and reverse the driver's earning row.
    var refund = await _wallet.RefundRidePaymentAsync(
        booking.PassengerId, booking.Ride.DriverId, booking.Id, booking.TotalPrice);
    if (!refund.Success)
        _logger.LogError("Refund FAILED for rejected booking {BookingId}: {Error}",
            booking.Id, refund.Error);

    await BroadcastBookingUpdate(booking.Id, booking.RideId, booking.PassengerId, "Rejected");
    await BroadcastSeatsUpdated(booking.RideId, booking.Ride.AvailableSeats, booking.Ride.TotalSeats);

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
    if (driverIdClaim == null) return Unauthorized("UserId claim missing");

    var driverId = Guid.Parse(driverIdClaim.Value);

    var bookings = await _context.Bookings
        .Include(b => b.Ride)
        .Include(b => b.Passenger)
        .Where(b => b.Ride.DriverId == driverId)
        .OrderByDescending(b => b.CreatedAt)
        .Select(b => new
        {
            id                 = b.Id,
            rideId             = b.RideId,
            status             = b.Status.ToString(),
            seatsBooked        = b.SeatsBooked,
            pickupStop         = b.PickupStop,
            dropoffStop        = b.DropoffStop,
            passengerAddress   = b.PassengerAddress,
            passengerLatitude  = b.PassengerLatitude,
            passengerLongitude = b.PassengerLongitude,
            createdAt          = b.CreatedAt,
            rideAvailableSeats = b.Ride.AvailableSeats,
            rideTotalSeats     = b.Ride.TotalSeats,
            pricePerSeat       = b.Ride.Price,
            totalPrice         = b.TotalPrice > 0 ? b.TotalPrice : b.Ride.Price * b.SeatsBooked,
            ride = new
            {
                fromAddress   = b.Ride.FromAddress,
                toAddress     = b.Ride.ToAddress,
                departureTime = b.Ride.DepartureTime,
                price         = b.Ride.Price
            },
            passenger = new
            {
                fullName    = b.Passenger.FullName,
                phoneNumber = b.Passenger.PhoneNumber
            }
        })
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

    if (booking.Status != BookingStatus.Pending && booking.Status != BookingStatus.Accepted)
        return BadRequest("Only pending or accepted bookings can be cancelled");

    if (booking.Ride.Status == "InProgress")
        return BadRequest("Ride already started. Cancellation not allowed.");

    // Refund seats that were reserved at booking creation
    booking.Ride.AvailableSeats += booking.SeatsBooked;

    booking.Status = BookingStatus.Cancelled;

    await _context.SaveChangesAsync();

    // 💰 Refund the passenger's wallet for this cancellation.
    var refund = await _wallet.RefundRidePaymentAsync(
        booking.PassengerId, booking.Ride.DriverId, booking.Id, booking.TotalPrice);
    if (!refund.Success)
        _logger.LogError("Refund FAILED for cancelled booking {BookingId}: {Error}",
            booking.Id, refund.Error);

    await BroadcastBookingUpdate(booking.Id, booking.RideId, booking.PassengerId, "Cancelled");
    await BroadcastSeatsUpdated(booking.RideId, booking.Ride.AvailableSeats, booking.Ride.TotalSeats);

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
    if (Enum.TryParse<BookingStatus>(status, true, out var parsedStatus))
    {
        query = query.Where(b => b.Status == parsedStatus);
    }
}

    var bookings = await query
        .OrderByDescending(b => b.CreatedAt)
        .Select(b => new
        {
            id                 = b.Id,
            rideId             = b.RideId,
            status             = b.Status.ToString(),
            seatsBooked        = b.SeatsBooked,
            totalPrice         = b.TotalPrice > 0 ? b.TotalPrice : b.Ride.Price * b.SeatsBooked,
            pickupStop         = b.PickupStop,
            dropoffStop        = b.DropoffStop,
            passengerAddress   = b.PassengerAddress,
            passengerLatitude  = b.PassengerLatitude,
            passengerLongitude = b.PassengerLongitude,
            createdAt          = b.CreatedAt,
            ride = new
            {
                fromAddress     = b.Ride.FromAddress,
                toAddress       = b.Ride.ToAddress,
                departureTime   = b.Ride.DepartureTime,
                price           = b.Ride.Price,
                status          = b.Ride.Status,
                pickupLocation  = b.Ride.PickupLocation
            },
            driver = new
            {
                fullName    = b.Ride.Driver.FullName,
                phoneNumber = b.Ride.Driver.PhoneNumber
            }
        })
        .ToListAsync();

    return Ok(bookings);
}
    }
}