namespace Saffar.Api.DTOs
{
    public class RideCreateDto
    {
        public Guid DriverId { get; set; }
        public Guid VehicleId { get; set; }

        public string FromAddress { get; set; } = string.Empty;
        public string ToAddress { get; set; } = string.Empty;
        public string? PickupLocation { get; set; }

        public DateTime DepartureTime { get; set; }
        public int AvailableSeats { get; set; }

        // 🔥 Nationwide route logic
        public List<string> PickupStops { get; set; } = new();
        public List<string> DropoffStops { get; set; } = new();
    }
}
