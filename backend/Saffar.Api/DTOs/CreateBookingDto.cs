using System.ComponentModel.DataAnnotations;

namespace Saffar.Api.DTOs
{
    public class CreateBookingDto
    {
        [Required]
        public Guid RideId { get; set; }

        [Required]
        public int Seats { get; set; }

        public string PickupStop { get; set; }
        public string DropoffStop { get; set; }

        public double? PassengerLatitude { get; set; }
        public double? PassengerLongitude { get; set; }
        public string? PassengerAddress { get; set; }
    }
}