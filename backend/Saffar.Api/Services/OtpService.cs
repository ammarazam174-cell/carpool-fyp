using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Saffar.Api.Data;
using Saffar.Api.Models;

namespace Saffar.Api.Services
{
    public class OtpIssueResult
    {
        public bool Ok { get; init; }
        public string? Error { get; init; }
        public int? RetryAfterSeconds { get; init; }
        public string? DevOtp { get; init; } // exposed only in Development
    }

    public enum OtpVerifyStatus { Ok, Invalid, Expired, Consumed, TooManyAttempts, NotFound }

    public class OtpVerifyResult
    {
        public OtpVerifyStatus Status { get; init; }
        public OtpCode? Code { get; init; }
    }

    public interface IOtpService
    {
        Task<OtpIssueResult> IssueAsync(
            string email,
            string purpose,
            string? targetEmail = null,
            CancellationToken ct = default);

        Task<OtpVerifyResult> VerifyAsync(
            string email,
            string purpose,
            string code,
            CancellationToken ct = default);
    }

    // Centralises OTP issuance + verification so every flow (signup, email
    // change, future phone verification, …) gets the same security guarantees:
    //   - BCrypt-hashed codes (raw code never persisted)
    //   - 5-minute expiry (configurable via ExpiryMinutes)
    //   - 60-second issuance cooldown per (email, purpose)
    //   - Max 5 verify attempts before invalidation
    //   - Single-use (ConsumedAt stamped on success)
    public class OtpService : IOtpService
    {
        private readonly SaffarDbContext _db;
        private readonly IEmailService _email;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<OtpService> _logger;

        private const int ExpiryMinutes = 5;
        private const int ResendCooldownSeconds = 60;
        private const int MaxAttempts = 5;

        public OtpService(
            SaffarDbContext db,
            IEmailService email,
            IWebHostEnvironment env,
            ILogger<OtpService> logger)
        {
            _db = db;
            _email = email;
            _env = env;
            _logger = logger;
        }

        public async Task<OtpIssueResult> IssueAsync(
            string email, string purpose, string? targetEmail = null, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(email))
                return new OtpIssueResult { Ok = false, Error = "Email is required." };
            email = email.Trim().ToLowerInvariant();

            // Rate-limit: only one pending code per (email, purpose) within cooldown window.
            var existing = await _db.OtpCodes
                .Where(o => o.Email == email && o.Purpose == purpose && o.ConsumedAt == null)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync(ct);

            if (existing != null)
            {
                var elapsed = (TimeZoneHelper.GetPakistanTime() - existing.CreatedAt).TotalSeconds;
                if (elapsed < ResendCooldownSeconds && existing.ExpiresAt > TimeZoneHelper.GetPakistanTime())
                {
                    var wait = (int)(ResendCooldownSeconds - elapsed);
                    return new OtpIssueResult
                    {
                        Ok = false,
                        Error = $"Please wait {wait}s before requesting another code.",
                        RetryAfterSeconds = wait,
                    };
                }
                // Invalidate any previous unconsumed codes for this (email, purpose).
                existing.ConsumedAt = TimeZoneHelper.GetPakistanTime();
            }

            var raw = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
            var otp = new OtpCode
            {
                Email = email,
                CodeHash = BCrypt.Net.BCrypt.HashPassword(raw),
                Purpose = purpose,
                TargetEmail = targetEmail?.Trim().ToLowerInvariant(),
                ExpiresAt = TimeZoneHelper.GetPakistanTime().AddMinutes(ExpiryMinutes),
            };
            _db.OtpCodes.Add(otp);
            await _db.SaveChangesAsync(ct);

            var subject = purpose switch
            {
                OtpPurpose.SignupEmail   => "Verify your Saffar email",
                OtpPurpose.EmailChange   => "Confirm your new Saffar email",
                OtpPurpose.PasswordReset => "Reset your Saffar password",
                _ => "Your Saffar verification code",
            };
            var body = BuildEmailBody(raw, subject);

            try
            {
                await _email.SendAsync(email, subject, body, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Otp] email delivery failed for {Email} {Purpose}", email, purpose);
                // Don't surface SMTP errors to the caller — the record is written
                // so the user can still re-request via the resend path.
            }

            _logger.LogInformation("[Otp] issued purpose={Purpose} email={Email}", purpose, email);

            return new OtpIssueResult
            {
                Ok = true,
                DevOtp = _env.IsDevelopment() ? raw : null,
            };
        }

        public async Task<OtpVerifyResult> VerifyAsync(
            string email, string purpose, string code, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(code))
                return new OtpVerifyResult { Status = OtpVerifyStatus.Invalid };

            email = email.Trim().ToLowerInvariant();
            code = code.Trim();

            var row = await _db.OtpCodes
                .Where(o => o.Email == email && o.Purpose == purpose && o.ConsumedAt == null)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync(ct);

            if (row == null) return new OtpVerifyResult { Status = OtpVerifyStatus.NotFound };

            if (row.ExpiresAt <= TimeZoneHelper.GetPakistanTime())
            {
                row.ConsumedAt = TimeZoneHelper.GetPakistanTime();
                await _db.SaveChangesAsync(ct);
                return new OtpVerifyResult { Status = OtpVerifyStatus.Expired };
            }

            if (row.Attempts >= MaxAttempts)
            {
                row.ConsumedAt = TimeZoneHelper.GetPakistanTime();
                await _db.SaveChangesAsync(ct);
                return new OtpVerifyResult { Status = OtpVerifyStatus.TooManyAttempts };
            }

            if (!BCrypt.Net.BCrypt.Verify(code, row.CodeHash))
            {
                row.Attempts += 1;
                await _db.SaveChangesAsync(ct);
                return new OtpVerifyResult { Status = OtpVerifyStatus.Invalid, Code = row };
            }

            row.ConsumedAt = TimeZoneHelper.GetPakistanTime();
            await _db.SaveChangesAsync(ct);
            return new OtpVerifyResult { Status = OtpVerifyStatus.Ok, Code = row };
        }

        private static string BuildEmailBody(string code, string subject) => $@"
<!doctype html>
<html>
  <body style=""font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
               background:#f8fafc;padding:24px;color:#0f172a"">
    <div style=""max-width:480px;margin:0 auto;background:#fff;border-radius:16px;
                padding:28px;box-shadow:0 6px 20px rgba(0,0,0,0.06)"">
      <h2 style=""margin:0 0 8px;color:#14532d"">Saffar</h2>
      <p style=""color:#475569;margin:0 0 18px"">{subject}</p>
      <div style=""font-size:32px;letter-spacing:8px;font-weight:800;text-align:center;
                  background:#ecfdf5;color:#14532d;padding:16px;border-radius:12px;
                  border:1px solid #bbf7d0"">{code}</div>
      <p style=""color:#64748b;font-size:13px;margin-top:18px"">
        This code expires in {ExpiryMinutes} minutes. Don't share it with anyone.
        If you didn't request it, ignore this email.
      </p>
    </div>
  </body>
</html>";
    }
}
