using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saffar.Api.Data;
using Saffar.Api.DTOs;
using Saffar.Api.Models;
using Saffar.Api.Services;

namespace Saffar.Api.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly SaffarDbContext _context;

        public AdminController(SaffarDbContext context)
        {
            _context = context;
        }

        // GET /api/admin/dashboard-stats
        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            return Ok(new DashboardStatsDto
            {
                TotalUsers      = await _context.Users.CountAsync(),
                TotalDrivers    = await _context.Users.CountAsync(u => u.Role == "Driver"),
                TotalPassengers = await _context.Users.CountAsync(u => u.Role == "Passenger"),
                TotalRides      = await _context.Rides.CountAsync(),
                TotalBookings   = await _context.Bookings.CountAsync(),
                TotalEarnings   = await _context.Users
                    .Where(u => u.Role == "Driver")
                    .SumAsync(u => u.Earnings)
            });
        }

        // GET /api/admin/drivers
        [HttpGet("drivers")]
        public async Task<IActionResult> GetAllDrivers()
        {
            var drivers = await _context.Users
                .Where(u => u.Role == "Driver")
                .OrderBy(u => u.DriverStatus)
                .Select(u => new AdminDriverDto
                {
                    Id              = u.Id,
                    FullName        = u.FullName ?? "Unknown",
                    PhoneNumber     = u.PhoneNumber,
                    Cnic            = u.CNIC,
                    ProfileImageUrl = u.ProfileImageUrl,
                    CnicImageUrl    = u.CNICImageUrl,
                    LicenseImageUrl = u.LicenseImageUrl,
                    DriverStatus    = u.DriverStatus
                })
                .ToListAsync();

            return Ok(drivers);
        }

        // PUT /api/admin/approve-driver/{id}
        [HttpPut("approve-driver/{id}")]
        public async Task<IActionResult> ApproveDriver(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null || user.Role != "Driver") return NotFound();
            user.IsDriverApproved = true;
            user.IsVerified       = true;
            user.DriverStatus     = "Approved";
            await _context.SaveChangesAsync();
            return Ok(new { message = "Driver approved" });
        }

        // PUT /api/admin/reject-driver/{id}
        [HttpPut("reject-driver/{id}")]
        public async Task<IActionResult> RejectDriver(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null || user.Role != "Driver") return NotFound();
            user.IsDriverApproved = false;
            user.IsVerified       = false;
            user.DriverStatus     = "Rejected";
            await _context.SaveChangesAsync();
            return Ok(new { message = "Driver rejected" });
        }

        // PUT /api/admin/approve-user/{id}
        [HttpPut("approve-user/{id}")]
        public async Task<IActionResult> ApproveUser(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            user.IsVerified   = true;
            user.DriverStatus = "Approved";
            if (user.Role == "Driver") user.IsDriverApproved = true;
            await _context.SaveChangesAsync();
            return Ok(new { message = "User approved" });
        }

        // PUT /api/admin/reject-user/{id}
        [HttpPut("reject-user/{id}")]
        public async Task<IActionResult> RejectUser(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            user.IsVerified   = false;
            user.DriverStatus = "Rejected";
            if (user.Role == "Driver") user.IsDriverApproved = false;
            await _context.SaveChangesAsync();
            return Ok(new { message = "User rejected" });
        }

        // GET /api/admin/rides
        [HttpGet("rides")]
        public async Task<IActionResult> GetAllRides()
        {
            var rides = await _context.Rides
                .Include(r => r.Driver)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new AdminRideDto
                {
                    Id             = r.Id,
                    DriverName     = r.Driver != null ? r.Driver.FullName ?? "Unknown" : "Unknown",
                    FromAddress    = r.FromAddress,
                    ToAddress      = r.ToAddress,
                    DepartureTime  = r.DepartureTime,
                    AvailableSeats = r.AvailableSeats,
                    Price          = r.Price,
                    Status         = r.Status
                })
                .ToListAsync();

            return Ok(rides);
        }

        // DELETE /api/admin/rides/{id}
        [HttpDelete("rides/{id}")]
        public async Task<IActionResult> DeleteRide(Guid id)
        {
            var ride = await _context.Rides
                .Include(r => r.Bookings)
                .Include(r => r.RideStops)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (ride == null) return NotFound();

            _context.RideStops.RemoveRange(ride.RideStops);
            _context.Bookings.RemoveRange(ride.Bookings);
            _context.Rides.Remove(ride);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Ride deleted" });
        }

        // GET /api/admin/users?role=Driver
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers([FromQuery] string? role)
        {
            var query = _context.Users.AsQueryable();
            if (!string.IsNullOrEmpty(role))
                query = query.Where(u => u.Role == role);

            var users = await query
                .OrderBy(u => u.Role)
                .Select(u => new AdminUserDto
                {
                    Id                = u.Id,
                    FullName          = u.FullName,
                    Role              = u.Role,
                    PhoneNumber       = u.PhoneNumber,
                    CreatedAt         = u.CreatedAt,
                    ProfileImageUrl   = u.ProfileImageUrl,
                    CNICImageUrl      = u.CNICImageUrl,
                    LicenseImageUrl   = u.LicenseImageUrl,
                    DriverStatus      = u.DriverStatus,
                    IsVerified        = u.IsVerified,
                    IsProfileComplete = u.IsProfileComplete
                })
                .ToListAsync();

            return Ok(users);
        }

        // ── Vehicle verification ───────────────────────────────────────────

        public class AdminVehicleDto
        {
            public Guid Id { get; set; }
            public Guid OwnerId { get; set; }
            public string? OwnerName { get; set; }
            public string? OwnerPhone { get; set; }
            public string Make { get; set; } = "";
            public string Model { get; set; } = "";
            public string PlateNumber { get; set; } = "";
            public int Seats { get; set; }
            public bool IsDefault { get; set; }
            public string? RegistrationDocUrl { get; set; }
            public bool IsVerified { get; set; }
            public DateTime? VerifiedAt { get; set; }
            public string? RejectionReason { get; set; }
            public DateTime CreatedAt { get; set; }
            public string VerificationStatus { get; set; } = "Pending";
        }

        public class VehicleRejectRequest
        {
            public string? Reason { get; set; }
        }

        // GET /api/admin/vehicles?status=Pending|Approved|Rejected
        [HttpGet("vehicles")]
        public async Task<IActionResult> GetAllVehicles([FromQuery] string? status)
        {
            var query = _context.Vehicles.Include(v => v.Owner).AsQueryable();

            var vehicles = await query
                .OrderByDescending(v => v.CreatedAt)
                .Select(v => new AdminVehicleDto
                {
                    Id                 = v.Id,
                    OwnerId            = v.OwnerId,
                    OwnerName          = v.Owner != null ? v.Owner.FullName : null,
                    OwnerPhone         = v.Owner != null ? v.Owner.PhoneNumber : null,
                    Make               = v.Make,
                    Model              = v.Model,
                    PlateNumber        = v.PlateNumber,
                    Seats              = v.Seats,
                    IsDefault          = v.IsDefault,
                    RegistrationDocUrl = v.RegistrationDocUrl,
                    IsVerified         = v.IsVerified,
                    VerifiedAt         = v.VerifiedAt,
                    RejectionReason    = v.RejectionReason,
                    CreatedAt          = v.CreatedAt,
                    VerificationStatus = v.IsVerified
                        ? "Approved"
                        : (v.RejectionReason != null ? "Rejected" : "Pending")
                })
                .ToListAsync();

            if (!string.IsNullOrEmpty(status))
            {
                vehicles = vehicles
                    .Where(v => string.Equals(v.VerificationStatus, status, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            return Ok(vehicles);
        }

        // PUT /api/admin/vehicles/{id}/approve
        [HttpPut("vehicles/{id}/approve")]
        public async Task<IActionResult> ApproveVehicle(Guid id)
        {
            var vehicle = await _context.Vehicles.FindAsync(id);
            if (vehicle == null) return NotFound();
            vehicle.IsVerified = true;
            vehicle.VerifiedAt = TimeZoneHelper.GetPakistanTime();
            vehicle.RejectionReason = null;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Vehicle approved" });
        }

        // PUT /api/admin/vehicles/{id}/reject
        [HttpPut("vehicles/{id}/reject")]
        public async Task<IActionResult> RejectVehicle(Guid id, [FromBody] VehicleRejectRequest? body)
        {
            var vehicle = await _context.Vehicles.FindAsync(id);
            if (vehicle == null) return NotFound();
            vehicle.IsVerified = false;
            vehicle.VerifiedAt = null;
            vehicle.RejectionReason = string.IsNullOrWhiteSpace(body?.Reason)
                ? "Rejected by admin"
                : body!.Reason!.Trim();
            await _context.SaveChangesAsync();
            return Ok(new { message = "Vehicle rejected" });
        }

        // GET /api/admin/bookings
        [HttpGet("bookings")]
        public async Task<IActionResult> GetAllBookings()
        {
            var bookings = await _context.Bookings
                .Include(b => b.Passenger)
                .Include(b => b.Ride)
                .OrderByDescending(b => b.CreatedAt)
                .Select(b => new AdminBookingDto
                {
                    Id            = b.Id,
                    PassengerName = b.Passenger != null ? b.Passenger.FullName ?? "Unknown" : "Unknown",
                    FromAddress   = b.Ride.FromAddress,
                    ToAddress     = b.Ride.ToAddress,
                    Status        = b.Status.ToString(),
                    CreatedAt     = b.CreatedAt
                })
                .ToListAsync();

            return Ok(bookings);
        }
    }
}
