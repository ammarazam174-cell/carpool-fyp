---
name: saffar-backend
description: |
  Guides ASP.NET Core 8 development on the Saffar carpooling API. This skill
  should be used when adding, modifying, or debugging backend features under
  `backend/Saffar.Api/` — including controllers, DTOs, EF Core models and
  migrations, JWT auth, role-based authorization, or Firebase push
  notifications. Encodes project conventions (custom JWT claim keys, BCrypt
  hashing, DTO-per-endpoint, cascade rules in `SaffarDbContext`) so new code
  stays consistent with existing patterns.
---

# Saffar Backend — ASP.NET Core Specialist

Guide for implementing features on the **Saffar** carpooling API.

## Scope

- **In scope**: controllers, DTOs, EF Core models/migrations, JWT/auth wiring, role-based `[Authorize]`, push notifications, CORS/config under `backend/Saffar.Api/`.
- **Out of scope**: frontend work (use `saffar-frontend`), payment gateway integration (not yet present), infrastructure/deployment.

## Stack at a Glance

- ASP.NET Core 8, EF Core 8 (SQL Server / SQLEXPRESS, DB = `SaffarDb`)
- JWT Bearer (HS256), BCrypt passwords, Firebase Admin SDK (push notifications)
- Swagger at `http://localhost:5000/swagger` in Development

## Before Implementation

Gather context before writing code.

| Source | Gather |
|--------|--------|
| **Codebase** | Read an analogous existing controller/DTO/model before creating a new one |
| **`SaffarDbContext.cs`** | Check existing relationships and cascade behavior before adding a new FK |
| **Conversation** | User's specific endpoint/feature requirements |
| **Skill References** | `references/patterns.md` for recurring code snippets |
| **CLAUDE.md** | Project-level conventions — always defer to these |

## Required Clarifications

Ask before implementing when any of these is unclear:

1. **Which role(s)** should access this endpoint? (`Admin`, `Driver`, `Passenger`, or multiple)
2. **Does it change the schema?** If yes, a migration is required — confirm the migration name.
3. **Request/response shape** — what fields are required vs optional?

## Optional Clarifications

Ask only if relevant:

4. Should a push notification fire on success?
5. Is this endpoint idempotent, or should it reject duplicates?

Note: Avoid asking too many questions in a single message.

## Key File Locations

| Concern | Path |
|---------|------|
| DI wiring & middleware | `backend/Saffar.Api/Program.cs` |
| DB schema + relationships | `backend/Saffar.Api/Data/SaffarDbContext.cs` |
| Auth logic | `backend/Saffar.Api/Controllers/AuthController.cs`, `Services/JwtService.cs` |
| Ride lifecycle | `backend/Saffar.Api/Controllers/RideController.cs` |
| Booking lifecycle | `backend/Saffar.Api/Controllers/BookingController.cs` |
| User / driver profile | `backend/Saffar.Api/Controllers/UsersController.cs` |
| Push notifications | `backend/Saffar.Api/Services/PushNotificationService.cs`, `Services/FirebaseService.cs` |
| All DTOs | `backend/Saffar.Api/DTOs/` (one file per concern) |
| Migrations | `backend/Saffar.Api/Migrations/` |

## Must Follow

- [ ] Every new endpoint has a matching DTO in `DTOs/` — no anonymous objects in controller returns.
- [ ] Extract the caller's user id with `User.FindFirstValue("userId")` (custom claim key, **not** `ClaimTypes.NameIdentifier`).
- [ ] Password hashing is always `BCrypt.Net.BCrypt.HashPassword()` / `Verify()`. Never store plain text.
- [ ] After any model change, run `dotnet ef migrations add <Name>` then `dotnet ef database update` before `dotnet run`.
- [ ] Role strings use exact casing: `"Admin"`, `"Driver"`, `"Passenger"` in `[Authorize(Roles = "...")]`.
- [ ] Wrap risky logic (search, external calls) in `try/catch` and return `Problem()` — do not leak raw exception messages.
- [ ] For file uploads, validate MIME/extension **before** writing to disk.

## Must Avoid

- Returning anonymous objects (`return Ok(new { ... })`) — always return a typed DTO.
- Using `ClaimTypes.NameIdentifier` to read user id (claim key is `"userId"`).
- Skipping migrations after editing a model.
- Logging or returning raw exception messages to clients.
- Introducing payment/money-deduction logic — no gateway integrated yet.

## Workflow: Add a New Endpoint

1. **Define the DTO(s)** in `DTOs/` — one file per concern, request and response shapes.
2. **Read a similar controller** (e.g. `BookingController.cs`) for DI constructor and return-type pattern.
3. **Add the action method** with `[Authorize(Roles = "...")]` and the appropriate HTTP verb attribute.
4. **Extract caller id** via `User.FindFirstValue("userId")` when needed.
5. **Return typed DTO** via `Ok(dto)`, `NotFound()`, or `Problem(...)`.
6. **If push notification applies**, call `PushNotificationService.SendNotificationAsync()` after state commit.
7. **Build and smoke-test** via Swagger.

## Workflow: Add/Change a Model

1. Edit the model under `Models/`.
2. Update `SaffarDbContext.cs` — `DbSet<T>` and `OnModelCreating` (FK, cascade behavior, indexes).
3. `dotnet ef migrations add <Descriptive_Name>`
4. Review the generated migration file — confirm it reflects the intended schema change.
5. `dotnet ef database update`
6. `dotnet build` to catch broken references elsewhere.

## Run & Build

```bash
cd backend/Saffar.Api
dotnet build
dotnet run          # listens on http://localhost:5000
```

## Examples

### Good — typed DTO, custom claim, role-guarded

```csharp
[HttpPost("book")]
[Authorize(Roles = "Passenger")]
public async Task<ActionResult<BookingResponseDto>> Create(CreateBookingDto dto)
{
    var userId = int.Parse(User.FindFirstValue("userId")!);
    var booking = await _bookingService.CreateAsync(userId, dto);
    return Ok(_mapper.ToResponse(booking));
}
```

### Bad — anonymous return, wrong claim key, unguarded

```csharp
[HttpPost("book")]
public async Task<IActionResult> Create(object dto) // untyped request
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier); // wrong claim
    // ... direct DB access, no DTO on return
    return Ok(new { id = 1, status = "ok" }); // anonymous
}
```

## Output Specification

When completing a backend task, deliver:

1. **Changed files list** with paths.
2. **Migration name** (if schema changed).
3. **Sample request/response** for any new endpoint (can be shown as cURL or Swagger).
4. **Affected roles** — who can call the new endpoint.

## Output Checklist

Before reporting a task done:

- [ ] `dotnet build` succeeds.
- [ ] New endpoint has matching DTO(s) in `DTOs/`.
- [ ] `[Authorize(Roles = ...)]` present where required.
- [ ] Migration added + applied if schema changed.
- [ ] No anonymous-object returns.
- [ ] No raw exceptions leak to client.

## Reference Resources

| Resource | URL | Use For |
|----------|-----|---------|
| ASP.NET Core 8 docs | https://learn.microsoft.com/en-us/aspnet/core/?view=aspnetcore-8.0 | Framework patterns |
| EF Core 8 migrations | https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations | Schema changes |
| JWT Bearer | https://learn.microsoft.com/en-us/aspnet/core/security/authentication/jwt | Auth wiring |
| BCrypt.Net-Next | https://github.com/BcryptNet/bcrypt.net | Password hashing |
| Firebase Admin .NET | https://firebase.google.com/docs/admin/setup | Push notifications |

If a pattern isn't covered here or in `references/`, fetch the official docs above rather than guessing.

## Reference Files

| File | When to Read |
|------|--------------|
| `references/patterns.md` | Recurring controller / DTO / migration snippets |
| `references/gotchas.md` | Known issues and workarounds in this codebase |
