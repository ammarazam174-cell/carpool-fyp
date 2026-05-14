using System;
using Saffar.Api.Services;

public class UserNotification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string FcmToken { get; set; }
    public DateTime CreatedAt { get; set; } = TimeZoneHelper.GetPakistanTime();
}
