using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Saffar.Api.Services;

namespace Saffar.Api.Models
{
    public enum BookingStatus
    {
        Pending,
        Accepted,
        Rejected,
        Cancelled,
        Completed
    }

    public class Booking
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid RideId { get; set; }
        [ForeignKey(nameof(RideId))]
        public Ride Ride { get; set; }

        [Required]
        public Guid PassengerId { get; set; }
        [ForeignKey(nameof(PassengerId))]
        public User Passenger { get; set; }

        public int SeatsBooked { get; set; }

        public BookingStatus Status { get; set; } = BookingStatus.Pending;

        public DateTime CreatedAt { get; set; } = TimeZoneHelper.GetPakistanTime();
        public DateTime BookedAt { get; set; } = TimeZoneHelper.GetPakistanTime();

        public string? PickupStop { get; set; }
        public string? DropoffStop { get; set; }

        // 📍 PASSENGER LOCATION
        public double? PassengerLatitude { get; set; }
        public double? PassengerLongitude { get; set; }
        public string? PassengerAddress { get; set; }

        public decimal TotalPrice { get; set; }
    }
}