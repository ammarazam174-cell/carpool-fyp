using System;
using System.ComponentModel.DataAnnotations;
using Saffar.Api.Services;

namespace Saffar.Api.Models
{
    public static class OtpPurpose
    {
        public const string SignupEmail    = "SignupEmail";    // Verify email at registration.
        public const string EmailChange    = "EmailChange";    // Verify a new email before swap.
        public const string PasswordReset  = "PasswordReset";  // Legacy column still supports this.
    }

    public class OtpCode
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Email address that receives (and verifies) the code. For
        /// EmailChange this is the CURRENT email of the user issuing the
        /// request — <see cref="TargetEmail"/> holds the new address.
        /// </summary>
        [Required, MaxLength(100)]
        public string Email { get; set; } = null!;

        /// <summary>BCrypt hash of the 6-digit code. Raw code is never stored.</summary>
        [Required]
        public string CodeHash { get; set; } = null!;

        /// <summary>See <see cref="OtpPurpose"/>.</summary>
        [Required, MaxLength(32)]
        public string Purpose { get; set; } = null!;

        /// <summary>New email for EmailChange purposes; null otherwise.</summary>
        [MaxLength(100)]
        public string? TargetEmail { get; set; }

        public DateTime ExpiresAt { get; set; }
        public DateTime? ConsumedAt { get; set; }

        /// <summary>Incremented on every failed verify; locks at a small cap.</summary>
        public int Attempts { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = TimeZoneHelper.GetPakistanTime();
    }
}
