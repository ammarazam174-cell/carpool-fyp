using System;
using System.ComponentModel.DataAnnotations;

namespace Saffar.Api.Models
{
    public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(100)]
    public string? FullName { get; set; }   // ← nullable rakho

    [Required, MaxLength(20)]
    public string PhoneNumber { get; set; }

    [Required, MaxLength(20)]
    public string Role { get; set; }

    public decimal Earnings { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsVerified { get; set; } = false;

    public int? Age { get; set; }

    public string? ProfileImageUrl { get; set; }

    public bool IsProfileComplete { get; set; } = false;

    public double Rating { get; set; }
}
}
