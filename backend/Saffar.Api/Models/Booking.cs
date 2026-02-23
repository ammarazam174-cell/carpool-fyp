using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Saffar.Api.Models
{
    public class Booking
    {
        public Guid Id { get; set; }

        [Required]
        public Guid RideId { get; set; }
        [ForeignKey(nameof(RideId))]
        public Ride Ride { get; set; }

        [Required]
        public Guid PassengerId { get; set; }
        [ForeignKey(nameof(PassengerId))]
        public User Passenger { get; set; }

        public int SeatsBooked { get; set; }

        [Required]
        public string Status { get; set; } = "Pending"; // Pending | Accepted | Rejected

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime BookedAt { get; set; } = DateTime.UtcNow;

        public string? PickupStop { get; set; }
        public string? DropoffStop { get; set; }
    }
}