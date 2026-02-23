using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saffar.Api.Models;
using Saffar.Api.Data;
using Saffar.Api.DTOs;
using Saffar.Api.Services;
using System.Security.Claims;

namespace Saffar.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly SaffarDbContext _context;
        private readonly JwtService _jwtService;

        public AuthController(SaffarDbContext context, JwtService jwtService)
        {
            _context = context;
            _jwtService = jwtService;
        }
        [HttpPost("login")]
public IActionResult Login([FromBody] LoginRequest request)
{
    if (string.IsNullOrWhiteSpace(request.PhoneNumber) ||
        string.IsNullOrWhiteSpace(request.Role))
    {
        return BadRequest("Phone number and role are required");
    }

    // 🔍 Check user by phone only (IMPORTANT)
    var user = _context.Users
        .FirstOrDefault(u => u.PhoneNumber == request.PhoneNumber);

    // 🆕 AUTO SIGNUP
    if (user == null)
    {
        user = new User
        {
            PhoneNumber = request.PhoneNumber,
            Role = request.Role,
            FullName = "New User",
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        _context.SaveChanges();
    }
    else
    {
        // 🚫 Role mismatch protection
        if (user.Role != request.Role)
        {
            return BadRequest(
                $"This phone number is already registered as {user.Role}"
            );
        }
    }

    // 🔐 JWT
    var token = _jwtService.GenerateToken(user);


    return Ok(new
{
    token,
    id = user.Id,
    fullName = user.FullName,
    role = user.Role,
    isProfileComplete = user.IsProfileComplete
});
}   
    }
}