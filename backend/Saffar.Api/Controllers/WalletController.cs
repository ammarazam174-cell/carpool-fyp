using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Saffar.Api.DTOs;
using Saffar.Api.Services;
using System.Security.Claims;

namespace Saffar.Api.Controllers
{
    [ApiController]
    [Route("api/wallet")]
    [Authorize] // any signed-in user (Driver or Passenger) — Admin uses web tools only
    public class WalletController : ControllerBase
    {
        private readonly IWalletService _wallet;
        private readonly ILogger<WalletController> _logger;

        public WalletController(IWalletService wallet, ILogger<WalletController> logger)
        {
            _wallet = wallet;
            _logger = logger;
        }

        // Saffar JWT carries both `userId` and ClaimTypes.NameIdentifier — accept
        // whichever is present so this controller works for tokens issued by
        // either the existing or future flows.
        private Guid? CurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("userId");
            return claim != null && Guid.TryParse(claim.Value, out var id) ? id : null;
        }

        // GET /api/wallet/balance
        [HttpGet("balance")]
        public async Task<IActionResult> GetBalance(CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Unauthorized(new { message = "UserId claim missing" });

            var wallet = await _wallet.GetWalletAsync(userId.Value, ct);
            return Ok(new WalletBalanceDto
            {
                WalletId = wallet.Id,
                Balance = wallet.Balance,
                UpdatedAt = wallet.UpdatedAt
            });
        }

        // POST /api/wallet/topup
        [HttpPost("topup")]
        public async Task<IActionResult> TopUp([FromBody] TopUpDto dto, CancellationToken ct)
        {
            var userId = CurrentUserId();
            if (userId == null) return Unauthorized(new { message = "UserId claim missing" });

            if (!ModelState.IsValid)
                return BadRequest(new { message = "Invalid amount." });

            try
            {
                // Honour an Idempotency-Key header too, in case the client
                // prefers HTTP-level idempotency (matches Stripe's convention).
                var headerKey = Request.Headers["Idempotency-Key"].FirstOrDefault();
                var key = !string.IsNullOrWhiteSpace(dto.IdempotencyKey)
                    ? dto.IdempotencyKey
                    : headerKey;

                var result = await _wallet.TopUpAsync(userId.Value, dto.Amount, key, ct);
                if (result.Status != "Success")
                    return BadRequest(result);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Top-up failed for user {UserId}", userId);
                return StatusCode(500, new { message = "Top-up failed. Please try again." });
            }
        }

        // GET /api/wallet/transactions?limit=50
        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions([FromQuery] int limit = 50, CancellationToken ct = default)
        {
            var userId = CurrentUserId();
            if (userId == null) return Unauthorized(new { message = "UserId claim missing" });

            limit = Math.Clamp(limit, 1, 200);
            var txns = await _wallet.ListTransactionsAsync(userId.Value, limit, ct);
            return Ok(txns);
        }
    }
}
