namespace Saffar.Api.DTOs
{
    public class AdminUserDto
    {
        public Guid Id { get; set; }
        public string? FullName { get; set; }
        public string Role { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string? ProfileImageUrl { get; set; }
        public string? CNICImageUrl { get; set; }
        public string? LicenseImageUrl { get; set; }
        public string DriverStatus { get; set; } = "Pending";
        public bool IsVerified { get; set; }
        public bool IsProfileComplete { get; set; }
    }
}
