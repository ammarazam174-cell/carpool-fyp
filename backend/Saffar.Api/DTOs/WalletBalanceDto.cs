namespace Saffar.Api.DTOs
{
    public class WalletBalanceDto
    {
        public Guid WalletId { get; set; }
        public decimal Balance { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
