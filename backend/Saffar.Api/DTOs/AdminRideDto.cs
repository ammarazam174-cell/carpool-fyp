namespace Saffar.Api.DTOs
{
    public class AdminRideDto
    {
        public Guid Id { get; set; }
        public string DriverName { get; set; } = string.Empty;
        public string FromAddress { get; set; } = string.Empty;
        public string ToAddress { get; set; } = string.Empty;
        public DateTime DepartureTime { get; set; }
        public int AvailableSeats { get; set; }
        public decimal Price { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
