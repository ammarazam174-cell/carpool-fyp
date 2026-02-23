namespace Saffar.Api.Models
{
    public class LoginRequest
    {
        public required string PhoneNumber { get; set; }
        public required string Role { get; set; }
    }
}