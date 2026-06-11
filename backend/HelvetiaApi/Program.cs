using System.Text;
using HelvetiaApi.Data;
using HelvetiaApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
    builder.WebHost.UseUrls($"http://*:{port}");

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? ConvertDatabaseUrl(Environment.GetEnvironmentVariable("DATABASE_URL"));

if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException(
        "Set ConnectionStrings__DefaultConnection or link a Render PostgreSQL database (DATABASE_URL).");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddSingleton<IFileStorageService, FileStorageService>();

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

try
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbSeeder.SeedAsync(context);
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Database seed failed. Check ConnectionStrings__DefaultConnection.");
}

app.UseCors("Frontend");
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
    try
    {
        var ok = await db.Database.CanConnectAsync();
        return ok
            ? Results.Ok(new { database = "connected" })
            : Results.Problem("Database connection failed.", statusCode: 503);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message, statusCode: 503);
    }
});

app.Run();

static string? ConvertDatabaseUrl(string? databaseUrl)
{
    if (string.IsNullOrWhiteSpace(databaseUrl))
        return null;

    if (!databaseUrl.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
        && !databaseUrl.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        return databaseUrl;

    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':', 2);
    var username = Uri.UnescapeDataString(userInfo[0]);
    var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
    var database = uri.AbsolutePath.TrimStart('/');

    return $"Host={uri.Host};Port={uri.Port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true";
}
