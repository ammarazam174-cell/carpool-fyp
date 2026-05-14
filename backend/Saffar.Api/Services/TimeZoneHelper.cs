namespace Saffar.Api.Services;

public static class TimeZoneHelper
{
    public static readonly TimeZoneInfo PakistanTz =
        TimeZoneInfo.FindSystemTimeZoneById("Pakistan Standard Time");

    public static readonly TimeSpan PakistanOffset = TimeSpan.FromHours(5);

    public static DateTime GetPakistanTime()
    {
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, PakistanTz);
    }
}
