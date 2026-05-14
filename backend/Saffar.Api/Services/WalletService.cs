using Microsoft.EntityFrameworkCore;
using Saffar.Api.Data;
using Saffar.Api.DTOs;
using Saffar.Api.Models;

namespace Saffar.Api.Services
{
    public class WalletService : IWalletService
    {
        private readonly SaffarDbContext _db;
        private readonly IPaymentGateway _gateway;
        private readonly ILogger<WalletService> _logger;

        public WalletService(
            SaffarDbContext db,
            IPaymentGateway gateway,
            ILogger<WalletService> logger)
        {
            _db = db;
            _gateway = gateway;
            _logger = logger;
        }

        public async Task<Wallet> EnsureWalletAsync(Guid userId, CancellationToken ct = default)
        {
            var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
            if (wallet != null) return wallet;

            wallet = new Wallet
            {
                UserId = userId,
                Balance = 0m,
                CreatedAt = TimeZoneHelper.GetPakistanTime(),
                UpdatedAt = TimeZoneHelper.GetPakistanTime()
            };
            _db.Wallets.Add(wallet);
            await _db.SaveChangesAsync(ct);
            return wallet;
        }

        public Task<Wallet> GetWalletAsync(Guid userId, CancellationToken ct = default)
            => EnsureWalletAsync(userId, ct);

        public async Task<TopUpResultDto> TopUpAsync(Guid userId, decimal amount, string? idempotencyKey = null, CancellationToken ct = default)
        {
            if (amount <= 0)
                throw new InvalidOperationException("Amount must be greater than zero.");

            var user = await _db.Users.FindAsync(new object?[] { userId }, ct)
                ?? throw new InvalidOperationException("User not found.");

            var wallet = await EnsureWalletAsync(userId, ct);

            // 0. Idempotency short-circuit. If the client already submitted this
            //    key (mobile retry, double-tap), return whatever the original
            //    attempt resolved to instead of charging again.
            if (!string.IsNullOrWhiteSpace(idempotencyKey))
            {
                var existing = await _db.WalletTransactions
                    .Where(t => t.UserId == userId && t.IdempotencyKey == idempotencyKey)
                    .OrderByDescending(t => t.CreatedAt)
                    .FirstOrDefaultAsync(ct);

                if (existing != null)
                {
                    _logger.LogInformation(
                        "Top-up idempotency hit for user {UserId} key {Key} → reusing txn {TxnId} ({Status})",
                        userId, idempotencyKey, existing.Id, existing.Status);
                    return Result(existing,
                        existing.ReferenceId ?? "",
                        existing.Status.ToString(),
                        existing.Status == TransactionStatus.Success
                            ? "Top-up already processed"
                            : "Previous attempt resolved",
                        wallet.Balance);
                }
            }

            // 1. Persist a Pending transaction first so we always have an
            //    audit row, even if the gateway call throws halfway through.
            var txn = new WalletTransaction
            {
                UserId = userId,
                Amount = amount,
                Type = TransactionType.TopUp,
                Status = TransactionStatus.Pending,
                IdempotencyKey = string.IsNullOrWhiteSpace(idempotencyKey) ? null : idempotencyKey,
                Description = "Wallet top-up via " + _gateway.Name,
                CreatedAt = TimeZoneHelper.GetPakistanTime()
            };
            _db.WalletTransactions.Add(txn);
            await _db.SaveChangesAsync(ct);

            // 2. Initiate at the gateway. With a real gateway this returns a
            //    redirect URL and the credit happens later via a webhook —
            //    for the mock we go straight to verification.
            var initiation = await _gateway.InitiatePaymentAsync(amount, user, ct);
            if (!initiation.Success)
            {
                txn.Status = TransactionStatus.Failed;
                txn.Description = initiation.Error ?? "Gateway initiation failed";
                await _db.SaveChangesAsync(ct);
                return Result(txn, "", "Failed", "Payment initiation failed", wallet.Balance);
            }
            txn.ReferenceId = initiation.ReferenceId;
            await _db.SaveChangesAsync(ct);

            // 3. Verify + credit atomically.
            await using var dbTx = await _db.Database.BeginTransactionAsync(ct);
            try
            {
                var verify = await _gateway.VerifyPaymentAsync(initiation.ReferenceId, ct);
                if (!verify.Success || verify.Status != "Success")
                {
                    txn.Status = TransactionStatus.Failed;
                    txn.Description = verify.Error ?? "Gateway verification failed";
                    await _db.SaveChangesAsync(ct);
                    await dbTx.CommitAsync(ct);
                    return Result(txn, initiation.ReferenceId, "Failed", "Payment verification failed", wallet.Balance);
                }

                wallet.Balance += amount;
                wallet.UpdatedAt = TimeZoneHelper.GetPakistanTime();
                txn.Status = TransactionStatus.Success;

                await _db.SaveChangesAsync(ct);
                await dbTx.CommitAsync(ct);
            }
            catch (Exception ex)
            {
                await dbTx.RollbackAsync(ct);
                _logger.LogError(ex, "Top-up DB transaction failed for user {UserId}", userId);

                txn.Status = TransactionStatus.Failed;
                txn.Description = "Internal error during credit: " + ex.Message;
                await _db.SaveChangesAsync(ct);
                throw;
            }

            return Result(txn, initiation.ReferenceId, "Success", "Top-up successful", wallet.Balance);
        }

        public async Task<RidePaymentResult> ProcessRidePaymentAsync(
            Guid passengerId, Guid driverId, Guid bookingId, decimal amount, CancellationToken ct = default)
        {
            if (amount <= 0)
                return new RidePaymentResult { Success = false, Error = "Amount must be greater than zero" };

            var passengerWallet = await EnsureWalletAsync(passengerId, ct);
            var driverWallet = await EnsureWalletAsync(driverId, ct);

            if (passengerWallet.Balance < amount)
                return new RidePaymentResult { Success = false, Error = "Insufficient wallet balance" };

            var reference = $"BOOKING-{bookingId:N}".ToUpperInvariant();

            await using var dbTx = await _db.Database.BeginTransactionAsync(ct);
            try
            {
                var debit = new WalletTransaction
                {
                    UserId = passengerId,
                    Amount = -amount,
                    Type = TransactionType.RidePayment,
                    Status = TransactionStatus.Success,
                    ReferenceId = reference,
                    Description = "Ride payment",
                    CreatedAt = TimeZoneHelper.GetPakistanTime()
                };

                var credit = new WalletTransaction
                {
                    UserId = driverId,
                    Amount = amount,
                    Type = TransactionType.DriverEarning,
                    Status = TransactionStatus.Success,
                    ReferenceId = reference,
                    Description = "Ride earning",
                    CreatedAt = TimeZoneHelper.GetPakistanTime()
                };

                passengerWallet.Balance -= amount;
                passengerWallet.UpdatedAt = TimeZoneHelper.GetPakistanTime();

                driverWallet.Balance += amount;
                driverWallet.UpdatedAt = TimeZoneHelper.GetPakistanTime();

                _db.WalletTransactions.Add(debit);
                _db.WalletTransactions.Add(credit);

                await _db.SaveChangesAsync(ct);
                await dbTx.CommitAsync(ct);

                return new RidePaymentResult
                {
                    Success = true,
                    PassengerTransactionId = debit.Id,
                    DriverTransactionId = credit.Id
                };
            }
            catch (Exception ex)
            {
                await dbTx.RollbackAsync(ct);
                _logger.LogError(ex, "Ride payment failed for booking {BookingId}", bookingId);
                return new RidePaymentResult { Success = false, Error = "Payment processing error" };
            }
        }

        public async Task<RidePaymentResult> RefundRidePaymentAsync(
            Guid passengerId, Guid driverId, Guid bookingId, decimal amount, CancellationToken ct = default)
        {
            if (amount <= 0)
                return new RidePaymentResult { Success = false, Error = "Amount must be greater than zero" };

            var passengerWallet = await EnsureWalletAsync(passengerId, ct);
            var driverWallet = await EnsureWalletAsync(driverId, ct);

            var reference = $"REFUND-{bookingId:N}".ToUpperInvariant();

            await using var dbTx = await _db.Database.BeginTransactionAsync(ct);
            try
            {
                // Refund always goes through, even if the driver's balance dips
                // negative (e.g. they've already withdrawn). Reconciliation
                // happens out of band — losing the refund is not an option.
                driverWallet.Balance -= amount;
                driverWallet.UpdatedAt = TimeZoneHelper.GetPakistanTime();

                passengerWallet.Balance += amount;
                passengerWallet.UpdatedAt = TimeZoneHelper.GetPakistanTime();

                var driverDebit = new WalletTransaction
                {
                    UserId = driverId,
                    Amount = -amount,
                    Type = TransactionType.Refund,
                    Status = TransactionStatus.Success,
                    ReferenceId = reference,
                    Description = "Refund issued — booking cancelled",
                    CreatedAt = TimeZoneHelper.GetPakistanTime()
                };

                var passengerCredit = new WalletTransaction
                {
                    UserId = passengerId,
                    Amount = amount,
                    Type = TransactionType.Refund,
                    Status = TransactionStatus.Success,
                    ReferenceId = reference,
                    Description = "Refund — booking cancelled",
                    CreatedAt = TimeZoneHelper.GetPakistanTime()
                };

                _db.WalletTransactions.Add(driverDebit);
                _db.WalletTransactions.Add(passengerCredit);

                await _db.SaveChangesAsync(ct);
                await dbTx.CommitAsync(ct);

                return new RidePaymentResult
                {
                    Success = true,
                    PassengerTransactionId = passengerCredit.Id,
                    DriverTransactionId = driverDebit.Id
                };
            }
            catch (Exception ex)
            {
                await dbTx.RollbackAsync(ct);
                _logger.LogError(ex, "Refund failed for booking {BookingId}", bookingId);
                return new RidePaymentResult { Success = false, Error = "Refund processing error" };
            }
        }

        public async Task<List<TransactionDto>> ListTransactionsAsync(Guid userId, int limit, CancellationToken ct = default)
        {
            return await _db.WalletTransactions
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .Take(limit)
                .Select(t => new TransactionDto
                {
                    Id = t.Id,
                    Amount = t.Amount,
                    Type = t.Type.ToString(),
                    Status = t.Status.ToString(),
                    ReferenceId = t.ReferenceId,
                    Description = t.Description,
                    CreatedAt = t.CreatedAt
                })
                .ToListAsync(ct);
        }

        private static TopUpResultDto Result(
            WalletTransaction txn, string referenceId, string status, string message, decimal newBalance)
            => new()
            {
                Message = message,
                TransactionId = txn.Id,
                ReferenceId = referenceId,
                Status = status,
                NewBalance = newBalance
            };
    }
}
