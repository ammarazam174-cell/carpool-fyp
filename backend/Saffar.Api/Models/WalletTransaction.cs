using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Saffar.Api.Services;

namespace Saffar.Api.Models
{
    public enum TransactionType
    {
        TopUp,
        RidePayment,
        Refund,
        DriverEarning
    }

    public enum TransactionStatus
    {
        Pending,
        Success,
        Failed
    }

    // 🧾 WALLET TRANSACTION — append-only audit log of every wallet credit/debit.
    // Sign convention: positive Amount = credit (money in), negative = debit (money out).
    public class WalletTransaction
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid UserId { get; set; }
        [ForeignKey(nameof(UserId))]
        public User User { get; set; } = null!;

        public decimal Amount { get; set; }

        public TransactionType Type { get; set; }
        public TransactionStatus Status { get; set; } = TransactionStatus.Pending;

        // Gateway reference (top-up) or BOOKING-{id} / REFUND-{id} for ride flows.
        [MaxLength(100)]
        public string? ReferenceId { get; set; }

        // Client-generated idempotency token. If a request comes in twice with
        // the same key (double-tap, network retry), the second call returns the
        // first result instead of creating a duplicate transaction.
        // Unique per (UserId, IdempotencyKey) when non-null.
        [MaxLength(64)]
        public string? IdempotencyKey { get; set; }

        [MaxLength(255)]
        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; } = TimeZoneHelper.GetPakistanTime();
    }
}
