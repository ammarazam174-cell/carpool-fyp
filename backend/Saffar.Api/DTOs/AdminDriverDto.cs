namespace Saffar.Api.DTOs
{
    public class AdminDriverDto
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string? Cnic { get; set; }
        public string? ProfileImageUrl { get; set; }
        public string? CnicImageUrl { get; set; }
        public string? LicenseImageUrl { get; set; }
        public string DriverStatus { get; set; } = "Pending"; // "Pending" | "Approved" | "Rejected"
    }
}
