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
    }
}