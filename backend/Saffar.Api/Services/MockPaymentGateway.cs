using Saffar.Api.Models;

namespace Saffar.Api.Services
{
    // Stand-in gateway used in dev / FYP demo. Always succeeds. The real
    // PayFastGateway / EasypaisaGateway would replace this without changing
    // the controller or WalletService.
    public class MockPaymentGateway : IPaymentGateway
    {
        private readonly ILogger<MockPaymentGateway> _logger;

        public MockPaymentGateway(ILogger<MockPaymentGateway> logger)
        {
            _logger = logger;
        }

        public string Name => "Mock";

        public Task<PaymentInitiation> InitiatePaymentAsync(decimal amount, User user, CancellationToken ct = default)
        {
            var referenceId = $"MOCK-{Guid.NewGuid():N}".ToUpperInvariant();
            _logger.LogInformation(
                "[MockGateway] Initiated payment {Ref} for user {UserId} amount {Amount} PKR",
                referenceId, user.Id, amount);

            return Task.FromResult(new PaymentInitiation
            {
                Success = true,
                ReferenceId = referenceId,
                RedirectUrl = null
            });
        }

        public Task<PaymentVerification> VerifyPaymentAsync(string referenceId, CancellationToken ct = default)
        {
            _logger.LogInformation("[MockGateway] Verified payment {Ref} → Success", referenceId);
            return Task.FromResult(new PaymentVerification
            {
                Success = true,
                ReferenceId = referenceId,
                Status = "Success"
            });
        }
    }
}
