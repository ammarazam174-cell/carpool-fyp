using System;
using Saffar.Api.Services;

namespace Saffar.Api.Models
{
    public class Vehicle
    {
        public Guid Id { get; set; }
        public Guid OwnerId { get; set; }

        public string Make { get; set; } = null!;
        public string Model { get; set; } = null!;
        public string PlateNumber { get; set; } = null!;
        public int Seats { get; set; }
        public bool IsDefault { get; set; } = false;
        public DateTime CreatedAt { get; set; } = TimeZoneHelper.GetPakistanTime();

        // Uploaded at add-vehicle time. Served from /uploads/vehicles/*.
        public string? RegistrationDocUrl { get; set; }

        // Admin verification lifecycle.
        // IsVerified=false + VerifiedAt=null  → "Pending" (awaiting admin review)
        // IsVerified=true                     → "Approved"
        // IsVerified=false + RejectionReason  → "Rejected"
        public bool IsVerified { get; set; } = false;
        public DateTime? VerifiedAt { get; set; }
        public string? RejectionReason { get; set; }

        public User Owner { get; set; } = null!;
    }
}
