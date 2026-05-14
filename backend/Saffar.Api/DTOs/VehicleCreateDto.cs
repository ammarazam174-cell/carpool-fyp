using System.ComponentModel.DataAnnotations;

namespace Saffar.Api.DTOs
{
    public class VehicleCreateDto
    {
        public string Make { get; set; } = null!;
        public string Model { get; set; } = null!;
        public string PlateNumber { get; set; } = null!;
        public int Seats { get; set; }
    }
}