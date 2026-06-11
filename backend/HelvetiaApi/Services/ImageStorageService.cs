using HelvetiaApi.DTOs;

namespace HelvetiaApi.Services;

public interface IFileStorageService
{
    Task<UploadImageResponse> SaveAsync(IFormFile file, HttpRequest request);
    bool DeleteByUrl(string? url);
    bool IsLocalUpload(string? url);
}

public class FileStorageService(IWebHostEnvironment environment) : IFileStorageService
{
    private static readonly HashSet<string> AllowedExtensions =
    [
        ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg", ".pdf"
    ];

    private const long MaxFileSize = 10 * 1024 * 1024;

    private string UploadDirectory =>
        Path.Combine(environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"), "uploads");

    public async Task<UploadImageResponse> SaveAsync(IFormFile file, HttpRequest request)
    {
        if (file.Length == 0)
            throw new InvalidOperationException("Dosya boş olamaz.");

        if (file.Length > MaxFileSize)
            throw new InvalidOperationException("Dosya boyutu 10 MB'dan büyük olamaz.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
            throw new InvalidOperationException("Desteklenen formatlar: JPEG, PNG, WEBP, GIF, BMP, SVG, PDF.");

        Directory.CreateDirectory(UploadDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(UploadDirectory, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return new UploadImageResponse($"/uploads/{fileName}");
    }

    public bool DeleteByUrl(string? url)
    {
        if (!IsLocalUpload(url))
            return false;

        var path = url!.StartsWith('/')
            ? url
            : new Uri(url).AbsolutePath;
        var fileName = Path.GetFileName(path);
        var filePath = Path.Combine(UploadDirectory, fileName);

        if (!File.Exists(filePath))
            return false;

        File.Delete(filePath);
        return true;
    }

    public bool IsLocalUpload(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return false;

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            return url.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase);

        return uri.AbsolutePath.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase);
    }
}
