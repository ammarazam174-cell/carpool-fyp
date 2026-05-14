namespace Saffar.Api.DTOs
{
    public class AdminBookingDto
    {
        public Guid Id { get; set; }
        public string PassengerName { get; set; } = string.Empty;
        public string FromAddress { get; set; } = string.Empty;
        public string ToAddress { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
