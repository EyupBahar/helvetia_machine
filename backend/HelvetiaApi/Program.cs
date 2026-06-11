using System.Text;
using HelvetiaApi.Data;
using HelvetiaApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
    builder.WebHost.UseUrls($"http://*:{port}");

var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
var rawConnection = !string.IsNullOrWhiteSpace(databaseUrl)
    ? databaseUrl
    : builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(rawConnection))
    throw new InvalidOperationException(
        "Set DATABASE_URL (Render: Add from Database) or ConnectionStrings__DefaultConnection.");

if (IsPostgresUrl(rawConnection))
{
    var connectionString = NormalizePostgresUrl(rawConnection);
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(connectionString));
}
else
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(rawConnection));
}

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddSingleton<IFileStorageService, FileStorageService>();
builder.Services.AddSingleton<IMediaUrlService, MediaUrlService>();

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
});

var jwtSettings = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSettings["Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
    throw new InvalidOperationException("Jwt__Key environment variable must be at least 32 characters.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();

var frontendUrl = builder.Configuration["FrontendUrl"]
    ?? Environment.GetEnvironmentVariable("FRONTEND_URL");
var corsOrigins = new List<string> { "http://localhost:3000" };
if (!string.IsNullOrWhiteSpace(frontendUrl))
    corsOrigins.Add(frontendUrl.TrimEnd('/'));

var extraOrigins = builder.Configuration["Cors:AllowedOrigins"]
    ?? Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS");
if (!string.IsNullOrWhiteSpace(extraOrigins))
{
    corsOrigins.AddRange(
        extraOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    );
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.SetIsOriginAllowed(origin =>
            {
                if (corsOrigins.Contains(origin))
                    return true;

                if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                    return false;

                return uri.Host.EndsWith(".onrender.com", StringComparison.OrdinalIgnoreCase);
            })
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

app.UseForwardedHeaders();
app.UseCors("Frontend");

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new
        {
            message = "Sunucu hatası. DATABASE_URL ve Jwt__Key ayarlarını kontrol edin.",
        });
    });
});

app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.MapGet("/api", () => Results.Ok(new
{
    message = "Helvetia API çalışıyor.",
    endpoints = new[]
    {
        "/api/categories",
        "/api/subcategories",
        "/api/auth/login",
        "/api/images",
    }
}));

app.MapGet("/", () => Results.Ok(new
{
    service = "Helvetia API",
    status = "online",
    endpoints = new
    {
        health = "/health",
        database = "/health/db",
        categories = "/api/categories",
    }
}));

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/health/db", async (AppDbContext db) =>
{
    var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
    var hasDatabaseUrl = !string.IsNullOrWhiteSpace(databaseUrl);
    var dbHost = TryGetDatabaseHost(databaseUrl);

    try
    {
        await db.Database.OpenConnectionAsync();
        await db.Database.CloseConnectionAsync();
        return Results.Ok(new
        {
            database = "connected",
            hasDatabaseUrl,
            host = dbHost,
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(
            ex.InnerException?.Message ?? ex.Message,
            statusCode: 503,
            extensions: new Dictionary<string, object?>
            {
                ["hasDatabaseUrl"] = hasDatabaseUrl,
                ["host"] = dbHost,
                ["hint"] = hasDatabaseUrl
                    ? "Check DATABASE_URL host/credentials and redeploy."
                    : "Add DATABASE_URL via Environment → Add from Database → helvetia-db.",
            });
    }
});

app.Lifetime.ApplicationStarted.Register(() =>
{
    _ = Task.Run(async () =>
    {
        try
        {
            await using var scope = app.Services.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await DbSeeder.SeedAsync(context);
            app.Logger.LogInformation("Database seed completed.");
        }
        catch (Exception ex)
        {
            app.Logger.LogError(ex, "Database seed failed.");
        }
    });
});

app.Run();

static bool IsPostgresUrl(string connection) =>
    connection.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
    || connection.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase);

static string? TryGetDatabaseHost(string? databaseUrl)
{
    if (string.IsNullOrWhiteSpace(databaseUrl) || !IsPostgresUrl(databaseUrl))
        return null;

    return new Uri(databaseUrl).Host;
}

static string NormalizePostgresUrl(string connection)
{
    var uri = new Uri(connection);
    var userInfo = uri.UserInfo.Split(':', 2);
    var username = Uri.UnescapeDataString(userInfo[0]);
    var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
    var database = uri.AbsolutePath.TrimStart('/');
    var port = uri.Port > 0 ? uri.Port : 5432;
    var host = uri.Host;

    var sslMode = host.Contains(".render.com", StringComparison.OrdinalIgnoreCase)
        ? "Require"
        : "Prefer";

    return
        $"Host={host};Port={port};Database={database};Username={username};Password={password};SSL Mode={sslMode};Trust Server Certificate=true";
}
