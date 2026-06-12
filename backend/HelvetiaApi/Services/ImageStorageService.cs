using HelvetiaApi.DTOs;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace HelvetiaApi.Services;

public interface IFileStorageService
{
    Task<UploadImageResponse> SaveAsync(IFormFile file, HttpRequest request);
    bool DeleteByUrl(string? url);
    bool IsLocalUpload(string? url);
}

public class FileStorageService(IWebHostEnvironment environment, IConfiguration configuration) : IFileStorageService
{
    private static readonly HashSet<string> AllowedExtensions =
    [
        ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg", ".pdf"
    ];

    private const long MaxFileSize = 10 * 1024 * 1024;
    private const string CloudinaryFolder = "helvetia-machine";
    private static readonly StringComparison IgnoreCase = StringComparison.OrdinalIgnoreCase;
    private readonly string? cloudinaryCloudName = GetCloudinaryCloudName(configuration);
    private readonly Cloudinary? cloudinary = CreateCloudinaryClient(configuration);

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

        if (cloudinary is not null)
        {
            var uploadedUrl = await UploadToCloudinaryAsync(file, extension);
            return new UploadImageResponse(uploadedUrl);
        }

        Directory.CreateDirectory(UploadDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(UploadDirectory, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return new UploadImageResponse($"/uploads/{fileName}");
    }

    public bool DeleteByUrl(string? url)
    {
        if (cloudinary is not null && TryParseCloudinaryAsset(url, out var publicId, out var resourceType))
        {
            var deletion = cloudinary.DestroyAsync(new DeletionParams(publicId)
            {
                ResourceType = resourceType,
                Invalidate = true
            }).GetAwaiter().GetResult();

            return deletion.Result is "ok" or "not found";
        }

        if (!IsLocalPath(url))
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
            return url.StartsWith("/uploads/", IgnoreCase);

        if (uri.AbsolutePath.StartsWith("/uploads/", IgnoreCase))
            return true;

        return IsManagedCloudinaryUrl(uri);
    }

    private async Task<string> UploadToCloudinaryAsync(IFormFile file, string extension)
    {
        var publicId = $"{CloudinaryFolder}/{Guid.NewGuid():N}";

        await using var stream = file.OpenReadStream();
        if (extension == ".pdf")
        {
            var rawResult = await cloudinary!.UploadAsync(new RawUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                PublicId = publicId,
                Overwrite = false,
                UniqueFilename = false
            });

            if (rawResult.Error is not null || rawResult.SecureUrl is null)
                throw new InvalidOperationException($"Cloudinary upload failed: {rawResult.Error?.Message}");

            return rawResult.SecureUrl.ToString();
        }

        var imageResult = await cloudinary!.UploadAsync(new ImageUploadParams
        {
            File = new FileDescription(file.FileName, stream),
            PublicId = publicId,
            Overwrite = false,
            UniqueFilename = false
        });

        if (imageResult.Error is not null || imageResult.SecureUrl is null)
            throw new InvalidOperationException($"Cloudinary upload failed: {imageResult.Error?.Message}");

        return imageResult.SecureUrl.ToString();
    }

    private static Cloudinary? CreateCloudinaryClient(IConfiguration configuration)
    {
        var cloudName = configuration["CLOUDINARY_CLOUD_NAME"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_CLOUD_NAME");
        var apiKey = configuration["CLOUDINARY_API_KEY"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_API_KEY");
        var apiSecret = configuration["CLOUDINARY_API_SECRET"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_API_SECRET");

        if (string.IsNullOrWhiteSpace(cloudName)
            || string.IsNullOrWhiteSpace(apiKey)
            || string.IsNullOrWhiteSpace(apiSecret))
            return null;

        return new Cloudinary(new Account(cloudName, apiKey, apiSecret))
        {
            Api = { Secure = true }
        };
    }

    private static string? GetCloudinaryCloudName(IConfiguration configuration) =>
        configuration["CLOUDINARY_CLOUD_NAME"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_CLOUD_NAME");

    private bool TryParseCloudinaryAsset(string? url, out string publicId, out ResourceType resourceType)
    {
        publicId = string.Empty;
        resourceType = ResourceType.Image;

        if (cloudinary is null || string.IsNullOrWhiteSpace(url))
            return false;

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || !IsManagedCloudinaryUrl(uri))
            return false;

        var parts = uri.AbsolutePath.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 4)
            return false;

        var uploadIndex = Array.IndexOf(parts, "upload");
        if (uploadIndex < 0 || uploadIndex + 1 >= parts.Length)
            return false;

        resourceType = parts.Length > 1 && parts[1].Equals("raw", IgnoreCase)
            ? ResourceType.Raw
            : ResourceType.Image;
        var startIndex = uploadIndex + 1;
        if (parts[startIndex].Length > 1 && parts[startIndex][0] == 'v' && int.TryParse(parts[startIndex][1..], out _))
            startIndex++;

        if (startIndex >= parts.Length)
            return false;

        var idParts = parts[startIndex..];
        var last = idParts[^1];
        var dotIndex = last.LastIndexOf('.');
        if (dotIndex > 0)
            idParts[^1] = last[..dotIndex];

        publicId = string.Join('/', idParts);
        return !string.IsNullOrWhiteSpace(publicId);
    }

    private bool IsManagedCloudinaryUrl(Uri uri)
    {
        if (!uri.Host.Contains("res.cloudinary.com", IgnoreCase))
            return false;

        if (string.IsNullOrWhiteSpace(cloudinaryCloudName))
            return false;

        return uri.AbsolutePath.StartsWith($"/{cloudinaryCloudName}/", IgnoreCase);
    }

    private static bool IsLocalPath(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return false;

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            return url.StartsWith("/uploads/", IgnoreCase);

        return uri.AbsolutePath.StartsWith("/uploads/", IgnoreCase);
    }
}
