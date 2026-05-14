using Saffar.Api.Models;

namespace Saffar.Api.Services
{
    public class PaymentInitiation
    {
        public bool Success { get; set; }
        public string ReferenceId { get; set; } = "";
        // Real gateways (PayFast/Easypaisa) would also return a redirect URL here.
        public string? RedirectUrl { get; set; }
        public string? Error { get; set; }
    }

    public class PaymentVerification
    {
        public bool Success { get; set; }
        public string ReferenceId { get; set; } = "";
        public string Status { get; set; } = ""; // "Success" | "Failed" | "Pending"
        public string? Error { get; set; }
    }

    // Abstraction so the wallet flow doesn't care whether we're calling the
    // mock gateway, PayFast, Easypaisa, etc. Swap the DI registration in
    // Program.cs to switch implementations.
    public interface IPaymentGateway
    {
        string Name { get; }
        Task<PaymentInitiation> InitiatePaymentAsync(decimal amount, User user, CancellationToken ct = default);
        Task<PaymentVerification> VerifyPaymentAsync(string referenceId, CancellationToken ct = default);
    }
}
