# Saffar Backend — Gotchas & Known Issues

## Custom JWT Claim Key

The access token uses `"userId"` (not the standard `sub` or `ClaimTypes.NameIdentifier`). Always read it with:

```csharp
User.FindFirstValue("userId")
```

## File Upload MIME Validation

Existing upload endpoints accept any file. **Before** writing to disk, validate:

- Allowed extensions (e.g. `.jpg`, `.jpeg`, `.png`, `.pdf`)
- Content-Type header against an allow-list
- Maximum size

Reject otherwise with `BadRequest`.

## Ride Search Leaks Exceptions

The ride search endpoint currently returns raw exception messages. When touching it, wrap in `try/catch` and use `Problem(...)`.

## No Payment Gateway

`Earnings` is tracked on `User` / `Ride`, but no money actually moves. Do **not** implement deduct/transfer logic — integration with JazzCash/Stripe is a future task.

## Role Casing Is Strict

`[Authorize(Roles = "Driver")]` works; `"driver"` does **not**. Keep exact casing: `"Admin"`, `"Driver"`, `"Passenger"`.

## Cascade vs Restrict

Default `OnDelete` is cascade in EF Core. `User → Vehicle` is explicitly **restrict**; deleting a user with vehicles will fail. Check `SaffarDbContext.OnModelCreating` before assuming cascade.

## CORS Origins Live in Two Places

CORS origins are defined in both `appsettings.json` (`Cors:AllowedOrigins`) and read in `Program.cs`. When adding an origin, update `appsettings.json` — do not hardcode in `Program.cs`.

## Swagger Only in Development

`/swagger` is only mounted when `ASPNETCORE_ENVIRONMENT=Development`. If Swagger 404s, check the env var.
