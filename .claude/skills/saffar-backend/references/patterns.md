# Saffar Backend — Recurring Patterns

## Controller Constructor (DI)

```csharp
public class RideController : ControllerBase
{
    private readonly SaffarDbContext _db;
    private readonly IPushNotificationService _push;

    public RideController(SaffarDbContext db, IPushNotificationService push)
    {
        _db = db;
        _push = push;
    }
}
```

## Reading the Caller's User Id

```csharp
var userId = int.Parse(User.FindFirstValue("userId")!);
```

`ClaimTypes.NameIdentifier` is **not** populated — the token uses the custom claim key `"userId"`.

## DTO File Layout

One file per concern under `DTOs/`. Example:

```csharp
// DTOs/CreateBookingDto.cs
public record CreateBookingDto(int RideId, int Seats, string? Notes);

// DTOs/BookingResponseDto.cs
public record BookingResponseDto(int Id, int RideId, int Seats, string Status, DateTime CreatedAt);
```

## Problem Response Instead of Raw Exception

```csharp
try
{
    var result = await _service.SearchAsync(query);
    return Ok(result);
}
catch (Exception ex)
{
    _logger.LogError(ex, "Ride search failed");
    return Problem(title: "Ride search failed", statusCode: 500);
}
```

## EF Core Relationship Configuration

Relationships live in `SaffarDbContext.OnModelCreating`. Example (cascade-restrict on user → vehicle):

```csharp
modelBuilder.Entity<Vehicle>()
    .HasOne(v => v.Owner)
    .WithMany(u => u.Vehicles)
    .HasForeignKey(v => v.OwnerId)
    .OnDelete(DeleteBehavior.Restrict);
```

## Migration Commands

```bash
dotnet ef migrations add AddRideStopsTable
dotnet ef database update
dotnet ef migrations remove   # undo last migration if not yet applied
```

## Push Notification

```csharp
await _push.SendNotificationAsync(
    userId: booking.PassengerId,
    title: "Booking confirmed",
    body: $"Your ride on {ride.DepartureAt:g} is booked."
);
```

Call **after** the state change is committed (to avoid notifying on rolled-back transactions).

## Password Hash + Verify

```csharp
// Hash on signup / password change
user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

// Verify on login
bool ok = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
```
