using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Saffar.Api.Services;

namespace Saffar.Api.Models
{
    // 💰 WALLET — one row per user (auto-created at signup), holds PKR balance.
    public class Wallet
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid UserId { get; set; }
        [ForeignKey(nameof(UserId))]
        public User User { get; set; } = null!;

        public decimal Balance { get; set; } = 0m;

        public DateTime CreatedAt { get; set; } = TimeZoneHelper.GetPakistanTime();
        public DateTime UpdatedAt { get; set; } = TimeZoneHelper.GetPakistanTime();
    }
}
