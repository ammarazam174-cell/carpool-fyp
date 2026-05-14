using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Saffar.Api.Services;

// All DateTime values in this project represent Pakistan Standard Time (UTC+5).
// SQL Server's datetime2 returns values with Kind=Unspecified, so the converter
// stamps the explicit "+05:00" offset on every outgoing value. Without that
// stamp, JS clients would parse naked ISO strings as the device's local time
// and shift the wall-clock by the device offset (the original UTC bug, just
// in a different direction).
//
// Incoming JSON: a value with an explicit offset is converted to PKT;
// a naked ISO string is assumed to already be PKT (the typical input from a
// datetime-local picker the user filled in PKT).
public class UtcDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type _, JsonSerializerOptions __)
    {
        var raw = reader.GetString();
        if (string.IsNullOrEmpty(raw)) return default;

        var hasOffset =
            raw.EndsWith("Z", StringComparison.OrdinalIgnoreCase) ||
            System.Text.RegularExpressions.Regex.IsMatch(raw, @"[+\-]\d{2}:?\d{2}$");

        if (!hasOffset)
        {
            var asPkt = DateTime.Parse(raw, CultureInfo.InvariantCulture, DateTimeStyles.None);
            return DateTime.SpecifyKind(asPkt, DateTimeKind.Unspecified);
        }

        var dto = DateTimeOffset.Parse(raw, CultureInfo.InvariantCulture);
        var pkt = TimeZoneInfo.ConvertTime(dto, TimeZoneHelper.PakistanTz).DateTime;
        return DateTime.SpecifyKind(pkt, DateTimeKind.Unspecified);
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions _)
    {
        DateTime pkt = value.Kind == DateTimeKind.Utc
            ? TimeZoneInfo.ConvertTimeFromUtc(value, TimeZoneHelper.PakistanTz)
            : value;

        var dto = new DateTimeOffset(
            DateTime.SpecifyKind(pkt, DateTimeKind.Unspecified),
            TimeZoneHelper.PakistanOffset);

        writer.WriteStringValue(dto.ToString("yyyy-MM-ddTHH:mm:ss.fffzzz", CultureInfo.InvariantCulture));
    }
}
