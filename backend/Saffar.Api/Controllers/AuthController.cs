using BCrypt.Net;
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

        public AuthController(
            SaffarDbContext context,
            JwtService jwtService,
            IWebHostEnvironment env,
            ILogger<AuthController> logger)
        {
            _context = context;
            _jwtService = jwtService;
            _env = env;
            _logger = logger;
        }

        // ✅ REGISTER
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            try
            {
                if (_context.Users.Any(x => x.Email == dto.Email))
                    return BadRequest("Email already exists");

                if (_context.Users.Any(x => x.PhoneNumber == dto.PhoneNumber))
                    return BadRequest("Phone number already in use");

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
                    CreatedAt = DateTime.UtcNow
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                return Ok(new { message = "User Registered Successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message + " | Inner: " + ex.InnerException?.Message);
            }
        }

        // ✅ LOGIN
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

                var token = _jwtService.GenerateToken(user);

                return Ok(new
                {
                    token,
                    id                = user.Id,
                    fullName          = user.FullName,
                    role              = user.Role,
                    isProfileComplete = user.IsProfileComplete,
                    isVerified        = user.IsVerified,
                    status            = user.DriverStatus   // "Pending" | "Approved" | "Rejected"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message + " | Inner: " + ex.InnerException?.Message);
            }
        }

        // ✅ FORGOT PASSWORD — generates a 6-digit OTP, stores its BCrypt hash, 15-minute expiry
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
                user.ResetOtpExpiry = DateTime.UtcNow.AddMinutes(15);
                await _context.SaveChangesAsync();

                // TODO: wire real delivery (email/SMS) in production. For now, log it.
                _logger.LogInformation("Password reset OTP for {Email}: {Otp}", user.Email, otp);

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

                if (user.ResetOtpExpiry < DateTime.UtcNow)
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