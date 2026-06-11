using System.Text;
using HelvetiaApi.Data;
using HelvetiaApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
    builder.WebHost.UseUrls($"http://*:{port}");

var rawConnection = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? Environment.GetEnvironmentVariable("DATABASE_URL");

if (string.IsNullOrWhiteSpace(rawConnection))
    throw new InvalidOperationException(
        "Set DATABASE_URL (Render: Add from Database) or ConnectionStrings__DefaultConnection.");

if (IsPostgresUrl(rawConnection))
{
    var dataSource = new NpgsqlDataSourceBuilder(rawConnection).Build();
    builder.Services.AddSingleton(dataSource);
    builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(dataSource));
}
else
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(rawConnection));
}

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
var appConfiguration = app.Configuration;

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
    var hasDatabaseUrl = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("DATABASE_URL"));
    var hasConnectionString = !string.IsNullOrWhiteSpace(
        appConfiguration.GetConnectionString("DefaultConnection"));

    try
    {
        var ok = await db.Database.CanConnectAsync();
        return ok
            ? Results.Ok(new
            {
                database = "connected",
                hasDatabaseUrl,
                hasConnectionString,
            })
            : Results.Problem("Database connection failed.", statusCode: 503);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message, statusCode: 503, extensions: new Dictionary<string, object?>
        {
            ["hasDatabaseUrl"] = hasDatabaseUrl,
            ["hasConnectionString"] = hasConnectionString,
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

app.Lifetime.ApplicationStopped.Register(() =>
{
    var dataSource = app.Services.GetService<NpgsqlDataSource>();
    dataSource?.Dispose();
});

app.Run();

static bool IsPostgresUrl(string connection) =>
    connection.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
    || connection.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase);
