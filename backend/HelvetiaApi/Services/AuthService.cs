using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HelvetiaApi.Data;
using HelvetiaApi.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace HelvetiaApi.Services;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
}

public class AuthService(AppDbContext context, IConfiguration configuration) : IAuthService
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var admin = await context.Admins
            .FirstOrDefaultAsync(a => a.Username == request.Username);

        if (admin is null || !BCrypt.Net.BCrypt.Verify(request.Password, admin.PasswordHash))
            return null;

        var token = GenerateToken(admin);
        return new LoginResponse(token, admin.Username);
    }

    private string GenerateToken(Models.Admin admin)
    {
        var jwtSettings = configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.Name, admin.Username),
            new Claim(ClaimTypes.Role, "Admin"),
            new Claim(ClaimTypes.NameIdentifier, admin.Id.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
