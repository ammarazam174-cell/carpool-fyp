using System;
using System.ComponentModel.DataAnnotations;
using Saffar.Api.Services;

namespace Saffar.Api.Models
{
    public class User
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [MaxLength(100)]
        public string? FullName { get; set; }

        [Required, MaxLength(20)]
        public string PhoneNumber { get; set; }

        [Required, MaxLength(20)]
        public string Role { get; set; }

        // 🔐 AUTH
        [Required, MaxLength(100)]
        public string Email { get; set; }

        [Required]
        public string PasswordHash { get; set; }

        public DateTime? DateOfBirth { get; set; }

        [MaxLength(15)]
        public string? CNIC { get; set; }

        // 💰 DRIVER STATS
        public decimal Earnings { get; set; } = 0;
        public double Rating { get; set; } = 0;

        // 🧾 SYSTEM
        public DateTime CreatedAt { get; set; } = TimeZoneHelper.GetPakistanTime();
        public bool IsVerified { get; set; } = false;
        public bool IsProfileComplete { get; set; } = false;

        // 👤 PROFILE
        public int? Age { get; set; }
        public string? Gender { get; set; }
        public string? ProfileImageUrl { get; set; }

        // 🪪 DRIVER VERIFICATION (NEW 🔥)
        public string? CNICImageUrl { get; set; }
        public string? LicenseImageUrl { get; set; }

        // 🚗 VEHICLE DETAILS (NEW 🔥)
        public string? VehicleName { get; set; }
        public string? VehicleNumber { get; set; }
        public string? VehicleModel { get; set; }

        // 🧠 FUTURE READY (OPTIONAL)
        public bool IsDriverApproved { get; set; } = false;
        public string DriverStatus { get; set; } = "Pending"; // "Pending" | "Approved" | "Rejected"

        // 🔑 PASSWORD RESET (OTP-based)
        public string? ResetOtpHash { get; set; }
        public DateTime? ResetOtpExpiry { get; set; }

        // ✉️ EMAIL VERIFICATION (flipped by /api/otp/verify on purpose=SignupEmail)
        public bool IsEmailVerified { get; set; } = false;
        public DateTime? EmailVerifiedAt { get; set; }
    }
}