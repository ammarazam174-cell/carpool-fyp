using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

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

        // ✅ SINGLE SOURCE OF TRUTH
        public int AvailableSeats { get; set; }

        public decimal Price { get; set; }

        public decimal PricePerSeat { get; set; }


        public string Status { get; set; } = "Active";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // 🔥 ROUTE STOPS (VIA POINTS)
        public ICollection<RideStop> RideStops { get; set; } = new List<RideStop>();

        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    }
}