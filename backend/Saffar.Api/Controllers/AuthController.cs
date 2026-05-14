using BCrypt.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saffar.Api.Models;
using Saffar.Api.Data;
using Saffar.Api.DTOs;
using Saffar.Api.Services;
using System.Security.Cryptography;

namespace Saffar.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly SaffarDbContext _context;
        private readonly JwtService _jwtService;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<AuthController> _logger;
        private readonly IOtpService _otp;
        private readonly IEmailService _email;
        private readonly IWalletService _wallet;

        public AuthController(
            SaffarDbContext context,
            JwtService jwtService,
            IWebHostEnvironment env,
            ILogger<AuthController> logger,
            IOtpService otp,
            IEmailService email,
            IWalletService wallet)
        {
            _context = context;
            _jwtService = jwtService;
            _env = env;
            _logger = logger;
            _otp = otp;
            _email = email;
            _wallet = wallet;
        }

        // ✅ REGISTER
        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            // Log the payload sans password so we can see exactly what the
            // mobile/web client posted when a registration is rejected.
            // ([ApiController] auto-returns 400 on JSON-binding failures
            // *before* this method runs — those show up in the pipeline log
            // as `← 400 POST /api/auth/register`. If you reach this line,
            // binding succeeded and the failure is in our own checks below.)
            _logger.LogInformation(
                "Register payload: FullName={FullName}, Email={Email}, Phone={Phone}, " +
                "CNIC={CNIC}, DOB={DOB}, Gender={Gender}, Role={Role}",
                dto.FullName, dto.Email, dto.PhoneNumber, dto.CNIC,
                dto.DateOfBirth, dto.Gender, dto.Role);

            try
            {
                if (string.IsNullOrWhiteSpace(dto.FullName))
                    return BadRequest(new { message = "Full name is required." });
                if (string.IsNullOrWhiteSpace(dto.Email))
                    return BadRequest(new { message = "Email is required." });
                if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
                    return BadRequest(new { message = "Password must be at least 6 characters." });
                if (string.IsNullOrWhiteSpace(dto.PhoneNumber))
                    return BadRequest(new { message = "Phone number is required." });
                if (dto.DateOfBirth == null)
                    return BadRequest(new { message = "Date of birth is required (format: YYYY-MM-DD)." });
                if (string.IsNullOrWhiteSpace(dto.Role))
                    return BadRequest(new { message = "Role is required." });

                if (_context.Users.Any(x => x.Email == dto.Email))
                    return BadRequest(new { message = "Email already exists" });

                if (_context.Users.Any(x => x.PhoneNumber == dto.PhoneNumber))
                    return BadRequest(new { message = "Phone number already in use" });

                var user = new User
                {
                    FullName = dto.FullName,
                    Email = dto.Email,
                    PhoneNumber = dto.PhoneNumber,
                    CNIC = dto.CNIC,
                    DateOfBirth = dto.DateOfBirth,
                    Gender = dto.Gender,
                    Role = dto.Role,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                    CreatedAt = TimeZoneHelper.GetPakistanTime()
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                // 💰 Auto-create the user's wallet at signup so /api/wallet/balance
                //    works immediately after first login (zero balance, no top-up yet).
                await _wallet.EnsureWalletAsync(user.Id);

                // Fire a signup-email OTP. Failures shouldn't block registration —
                // the client can always hit /api/otp/send to retry.
                var issue = await _otp.IssueAsync(user.Email, OtpPurpose.SignupEmail);

                return Ok(new
                {
                    message = "User Registered Successfully",
                    email = user.Email,
                    // devOtp only populated in Development — lets the mobile flow be
                    // tested without actual email delivery.
                    devOtp = issue.DevOtp,
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message + " | Inner: " + ex.InnerException?.Message);
            }
        }

        // ✅ LOGIN
        [AllowAnonymous]
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginDto dto)
        {
            try
            {
                var user = _context.Users
                    .FirstOrDefault(x => x.Email == dto.Email);

                if (user == null ||
                    !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                {
                    return Unauthorized("Invalid email or password");
                }

                // Block sign-in for accounts that haven't completed email OTP
                // verification. Surface a structured payload so the mobile
                // client can route the user back to the OTP screen instead of
                // showing a generic "Unauthorized" toast.
                //
                // DEV BYPASS: in Development we auto-verify on first login so
                // local seed accounts (e.g. admin@saffar.pk) and any user
                // created before the OTP flow existed can still get in
                // without a working SMTP server. This branch is gated on
                // IWebHostEnvironment.IsDevelopment() so production keeps
                // enforcing the OTP requirement.
                if (!user.IsEmailVerified)
                {
                    if (_env.IsDevelopment())
                    {
                        user.IsEmailVerified = true;
                        user.EmailVerifiedAt = TimeZoneHelper.GetPakistanTime();
                        _context.SaveChanges();
                        _logger.LogWarning(
                            "[dev] Auto-verified email for {Email} on login (Development env).",
                            user.Email);
                    }
                    else
                    {
                        return StatusCode(403, new
                        {
                            message = "Email not verified. Please verify your email to continue.",
                            needsEmailVerification = true,
                            email = user.Email,
                        });
                    }
                }

                var token = _jwtService.GenerateToken(user);

                return Ok(new
                {
                    token,
                    id                = user.Id,
                    fullName          = user.FullName,
                    role              = user.Role,
                    isProfileComplete = user.IsProfileComplete,
                    isVerified        = user.IsVerified,
                    isEmailVerified   = user.IsEmailVerified,
                    status            = user.DriverStatus   // "Pending" | "Approved" | "Rejected"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message + " | Inner: " + ex.InnerException?.Message);
            }
        }

        // ───────────────────────────────────────────────────────────────────
        // EMAIL OTP — alias routes living under /api/auth/* so the mobile
        // client only ever talks to one controller for auth flows.
        //
        // Both endpoints delegate to IOtpService (single source of truth for
        // BCrypt hashing, 5-min expiry, 60s resend cooldown, attempt limiting,
        // single-use enforcement). The full email-change flow with side
        // effects on User.Email lives on OtpController.
        // ───────────────────────────────────────────────────────────────────
        public class SendOtpDto
        {
            public string Email { get; set; } = "";
        }

        public class VerifyOtpDto
        {
            public string Email { get; set; } = "";
            public string Otp { get; set; } = "";
        }

        [AllowAnonymous]
        [HttpPost("send-otp")]
        public async Task<IActionResult> SendOtp([FromBody] SendOtpDto dto, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
                return BadRequest(new { message = "Email is required." });

            // Don't reveal whether an account exists for this address —
            // signup itself returns the email, and resend should look the
            // same regardless. The OtpService throttles per-email anyway.
            var result = await _otp.IssueAsync(dto.Email, OtpPurpose.SignupEmail, ct: ct);
            if (!result.Ok)
                return StatusCode(429, new { message = result.Error, retryAfterSeconds = result.RetryAfterSeconds });

            return Ok(new { message = "OTP sent to your email.", devOtp = result.DevOtp });
        }

        [AllowAnonymous]
        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpDto dto, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Otp))
                return BadRequest(new { message = "Email and OTP are required." });

            var verify = await _otp.VerifyAsync(dto.Email, OtpPurpose.SignupEmail, dto.Otp, ct);

            switch (verify.Status)
            {
                case OtpVerifyStatus.NotFound:
                case OtpVerifyStatus.Consumed:
                    return BadRequest(new { message = "No active code for this email. Request a new one." });
                case OtpVerifyStatus.Expired:
                    return BadRequest(new { message = "This code has expired. Tap Resend to get a new one." });
                case OtpVerifyStatus.TooManyAttempts:
                    return BadRequest(new { message = "Too many incorrect attempts. Request a new code." });
                case OtpVerifyStatus.Invalid:
                    return BadRequest(new { message = "Incorrect OTP. Please try again." });
            }

            // OK branch — flip IsEmailVerified on the matching account.
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == dto.Email.Trim().ToLower(), ct);
            if (user == null)
                return BadRequest(new { message = "No account found for this email." });

            user.IsEmailVerified = true;
            user.EmailVerifiedAt = TimeZoneHelper.GetPakistanTime();
            await _context.SaveChangesAsync(ct);

            return Ok(new { message = "Email verified successfully." });
        }

        // ✅ FORGOT PASSWORD — generates a 6-digit OTP, stores its BCrypt hash, 15-minute expiry
        [AllowAnonymous]
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Email))
                    return BadRequest("Email is required");

                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email == dto.Email);

                // Always respond with the same message to avoid leaking account existence
                var genericResponse = new
                {
                    message = "If an account exists for that email, a reset code has been sent."
                };

                if (user == null)
                    return Ok(genericResponse);

                var otp = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
                user.ResetOtpHash = BCrypt.Net.BCrypt.HashPassword(otp);
                user.ResetOtpExpiry = TimeZoneHelper.GetPakistanTime().AddMinutes(15);
                await _context.SaveChangesAsync();

                const string subject = "Reset your Saffar password";
                var body = $@"
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
                  border:1px solid #bbf7d0"">{otp}</div>
      <p style=""color:#64748b;font-size:13px;margin-top:18px"">
        This code expires in 15 minutes. Don't share it with anyone.
        If you didn't request a password reset, ignore this email.
      </p>
    </div>
  </body>
</html>";

                try
                {
                    await _email.SendAsync(user.Email, subject, body);
                    _logger.LogInformation("Password reset OTP emailed to {Email}", user.Email);
                }
                catch (Exception ex)
                {
                    // Don't leak SMTP failures to the caller — the OTP record is
                    // saved, so the user can retry. Log so we can see the cause.
                    _logger.LogError(ex, "Password reset email send failed for {Email}", user.Email);
                }

                // Only expose OTP in Development so the mobile flow can be tested end-to-end.
                if (_env.IsDevelopment())
                    return Ok(new { message = genericResponse.message, devOtp = otp });

                return Ok(genericResponse);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message + " | Inner: " + ex.InnerException?.Message);
            }
        }

        // ✅ RESET PASSWORD — verifies OTP + expiry, replaces password hash, clears reset fields
        [AllowAnonymous]
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Email) ||
                    string.IsNullOrWhiteSpace(dto.Otp) ||
                    string.IsNullOrWhiteSpace(dto.NewPassword))
                {
                    return BadRequest("Email, OTP, and new password are required");
                }

                if (dto.NewPassword.Length < 6)
                    return BadRequest("Password must be at least 6 characters");

                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email == dto.Email);

                if (user == null ||
                    string.IsNullOrEmpty(user.ResetOtpHash) ||
                    user.ResetOtpExpiry == null)
                {
                    return BadRequest("Invalid or expired reset code");
                }

                if (user.ResetOtpExpiry < TimeZoneHelper.GetPakistanTime())
                {
                    user.ResetOtpHash = null;
                    user.ResetOtpExpiry = null;
                    await _context.SaveChangesAsync();
                    return BadRequest("Reset code has expired. Please request a new one.");
                }

                if (!BCrypt.Net.BCrypt.Verify(dto.Otp, user.ResetOtpHash))
                    return BadRequest("Invalid or expired reset code");

                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
                user.ResetOtpHash = null;
                user.ResetOtpExpiry = null;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Password has been reset. You can now sign in." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message + " | Inner: " + ex.InnerException?.Message);
            }
        }
    }
}