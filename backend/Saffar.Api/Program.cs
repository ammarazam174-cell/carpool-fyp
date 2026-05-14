using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using Saffar.Api.Data;
using Saffar.Api.Services;
using Saffar.Api.Hubs;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// Bind to all interfaces so phones/emulators on the LAN can reach the API.
// Default Kestrel binds only to localhost, which blocks EXPO_PUBLIC_API_URL
// pointing at the host LAN IP.
builder.WebHost.UseUrls("http://0.0.0.0:5000");

// DbContext
builder.Services.AddDbContext<SaffarDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Controllers
builder.Services.AddControllers().AddJsonOptions(opts =>
{
    opts.JsonSerializerOptions.Converters.Add(new UtcDateTimeConverter());
});

// SignalR
builder.Services.AddSignalR();

// 🔔 PUSH NOTIFICATION SERVICE (ADD HERE)
builder.Services.AddScoped<PushNotificationService>();

// ✉️ EMAIL + OTP
builder.Services.AddScoped<IEmailService, SmtpEmailService>();
builder.Services.AddScoped<IOtpService, OtpService>();

// 💰 WALLET + PAYMENT GATEWAY
// Driven by appsettings → PaymentGateway:{Mode,Provider}.
//   Mode = Test  → always MockPaymentGateway, even if Provider says PayFast
//   Mode = Live  → DI looks up Provider (PayFast / Easypaisa) — both not yet
//                  implemented; until then we fall back to Mock and warn.
{
    var mode     = builder.Configuration["PaymentGateway:Mode"]     ?? "Test";
    var provider = builder.Configuration["PaymentGateway:Provider"] ?? "Mock";

    builder.Services.AddScoped<IPaymentGateway>(sp =>
    {
        var log = sp.GetRequiredService<ILogger<MockPaymentGateway>>();
        if (string.Equals(mode, "Live", StringComparison.OrdinalIgnoreCase))
        {
            // TODO: switch on `provider` → PayFastPaymentGateway / EasypaisaPaymentGateway.
            log.LogWarning("[Payment] Mode=Live but no live providers wired yet — using MockPaymentGateway.");
        }
        else
        {
            log.LogInformation("[Payment] Mode={Mode} Provider={Provider} → MockPaymentGateway active.", mode, provider);
        }
        return new MockPaymentGateway(log);
    });
}
builder.Services.AddScoped<IWalletService, WalletService>();

// 🔥 CORS — permissive in dev so the API works from any origin (Vite dev
// server on localhost, Expo web, mobile devices on a hotspot, etc.) without
// re-listing IPs every time the network changes.
//
// SetIsOriginAllowed(_ => true) reflects the request origin instead of using
// "*", which is required to keep AllowCredentials() working for the SignalR
// WebSocket handshake.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy
            .SetIsOriginAllowed(_ => true)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// JWT
builder.Services.AddScoped<JwtService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"])
        ),
        RoleClaimType = ClaimTypes.Role
    };
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Saffar API",
        Version = "v1"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {your JWT token}"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
// FirebaseService.Init();
var app = builder.Build();

// Lightweight request/response logger so we can see why mobile/web requests
// fail (timeouts, 4xx, 5xx) instead of guessing from the client side.
app.Use(async (ctx, next) =>
{
    var logger = ctx.RequestServices.GetRequiredService<ILoggerFactory>()
        .CreateLogger("HttpPipeline");
    var sw = System.Diagnostics.Stopwatch.StartNew();
    try
    {
        logger.LogInformation("→ {Method} {Path} from {Remote}",
            ctx.Request.Method, ctx.Request.Path, ctx.Connection.RemoteIpAddress);
        await next();
        sw.Stop();
        logger.LogInformation("← {Status} {Method} {Path} in {Ms}ms",
            ctx.Response.StatusCode, ctx.Request.Method, ctx.Request.Path, sw.ElapsedMilliseconds);
    }
    catch (Exception ex)
    {
        sw.Stop();
        logger.LogError(ex, "✖ {Method} {Path} threw after {Ms}ms",
            ctx.Request.Method, ctx.Request.Path, sw.ElapsedMilliseconds);
        throw;
    }
});

app.UseSwagger();
app.UseSwaggerUI();

// Static files must come before routing so /uploads/* is served directly
app.UseStaticFiles();

//app.UseHttpsRedirection();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<BookingHub>("/bookingHub");

app.Run();
