namespace Saffar.Api.DTOs
{
    public class TopUpResultDto
    {
        public string Message { get; set; } = "";
        public Guid TransactionId { get; set; }
        public string ReferenceId { get; set; } = "";
        public string Status { get; set; } = ""; // "Success" | "Failed" | "Pending"
        public decimal NewBalance { get; set; }
    }
}
