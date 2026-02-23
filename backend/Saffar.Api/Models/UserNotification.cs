using System;

public class UserNotification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string FcmToken { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
