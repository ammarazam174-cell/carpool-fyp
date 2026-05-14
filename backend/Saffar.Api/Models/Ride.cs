using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;
using Saffar.Api.Services;

namespace Saffar.Api.Models
{
    public class Ride
    {
        public Guid Id { get; set; }

        // Driver
        public Guid DriverId { get; set; }
        [ForeignKey(nameof(DriverId))]
        public User? Driver { get; set; }

        // Vehicle
        public Guid VehicleId { get; set; }
        [ForeignKey(nameof(VehicleId))]
        public Vehicle? Vehicle { get; set; }

        [Required, MaxLength(250)]
        public string FromAddress { get; set; } = string.Empty;

        [Required, MaxLength(250)]
        public string ToAddress { get; set; } = string.Empty;

        public DateTime DepartureTime { get; set; }

        public int TotalSeats { get; set; }
        public int AvailableSeats { get; set; }

        public decimal Price { get; set; }

        public decimal PricePerSeat { get; set; }


        public string Status { get; set; } = "Active";
        // "Active" | "InProgress" | "Completed" | "Cancelled"

        public string? PickupLocation { get; set; }

        // Live driver location (updated every 5-10s while ride is InProgress)
        public double? DriverLat { get; set; }
        public double? DriverLng { get; set; }
        public DateTime? DriverLocationUpdatedAt { get; set; }

        public DateTime CreatedAt { get; set; } = TimeZoneHelper.GetPakistanTime();

        // Set when the driver marks the ride as Completed. Stored in PKT to
        // match every other DateTime in the project. Used by analytics to
        // bucket earnings into the day they were actually earned, instead of
        // the day the ride was scheduled to depart.
        public DateTime? CompletedAt { get; set; }

        // 🔥 ROUTE STOPS (VIA POINTS)
        public ICollection<RideStop> RideStops { get; set; } = new List<RideStop>();

        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    }
}