using System.ComponentModel.DataAnnotations;

namespace Saffar.Api.DTOs
{
    public class TopUpDto
    {
        [Required]
        [Range(100.0, 1_000_000.0, ErrorMessage = "Minimum top-up is Rs. 100. Maximum is Rs. 1,000,000.")]
        public decimal Amount { get; set; }

        // Optional client-generated idempotency token (UUID). If two requests
        // arrive with the same key, the second one returns the first result
        // instead of charging twice. Strongly recommended on mobile.
        [MaxLength(64)]
        public string? IdempotencyKey { get; set; }
    }
}
