using Saffar.Api.DTOs;
using Saffar.Api.Models;

namespace Saffar.Api.Services
{
    public class RidePaymentResult
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
        public Guid? PassengerTransactionId { get; set; }
        public Guid? DriverTransactionId { get; set; }
    }

    // All wallet money movement goes through here so balance updates and
    // transaction-log writes are kept in lockstep inside DB transactions.
    public interface IWalletService
    {
        Task<Wallet> EnsureWalletAsync(Guid userId, CancellationToken ct = default);
        Task<Wallet> GetWalletAsync(Guid userId, CancellationToken ct = default);
        Task<TopUpResultDto> TopUpAsync(Guid userId, decimal amount, string? idempotencyKey = null, CancellationToken ct = default);
        Task<RidePaymentResult> ProcessRidePaymentAsync(
            Guid passengerId, Guid driverId, Guid bookingId, decimal amount, CancellationToken ct = default);
        Task<RidePaymentResult> RefundRidePaymentAsync(
            Guid passengerId, Guid driverId, Guid bookingId, decimal amount, CancellationToken ct = default);
        Task<List<TransactionDto>> ListTransactionsAsync(Guid userId, int limit, CancellationToken ct = default);
    }
}
