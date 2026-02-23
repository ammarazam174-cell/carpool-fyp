using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Saffar.Api.Data;     // ✅ THIS IS REQUIRED
using Saffar.Api.DTOs;
using Saffar.Api.Models;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly SaffarDbContext _context;

    public NotificationsController(SaffarDbContext context)
    {
        _context = context;
    }

    [HttpPost("token")]
    public async Task<IActionResult> SaveToken([FromBody] SaveTokenDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var guidUserId = Guid.Parse(userId);

        // 🔁 check if token already exists
        var existing = await _context.UserNotifications
            .FirstOrDefaultAsync(x => x.UserId == guidUserId);

        if (existing != null)
        {
            existing.FcmToken = dto.Token;
            existing.CreatedAt = DateTime.UtcNow;
        }
        else
        {
            _context.UserNotifications.Add(new UserNotification
            {
                UserId = guidUserId,
                FcmToken = dto.Token
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "FCM token saved" });
    }
}