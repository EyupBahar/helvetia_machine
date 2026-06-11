namespace HelvetiaApi.Services;

public interface IMediaUrlService
{
    string PublicBase { get; }
    string ToStoredPath(string? url);
    string ToPublicUrl(string? url);
}

public class MediaUrlService(IConfiguration configuration) : IMediaUrlService
{
    public string PublicBase =>
        (configuration["PUBLIC_BASE_URL"]
         ?? Environment.GetEnvironmentVariable("RENDER_EXTERNAL_URL")
         ?? "http://localhost:5001").TrimEnd('/');

    public string ToStoredPath(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return string.Empty;

        if (url.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
            return url;

        if (Uri.TryCreate(url, UriKind.Absolute, out var uri)
            && uri.AbsolutePath.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
            return uri.AbsolutePath;

        return url;
    }

    public string ToPublicUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return string.Empty;

        if (url.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
            return $"{PublicBase}{url}";

        if (Uri.TryCreate(url, UriKind.Absolute, out var uri)
            && uri.AbsolutePath.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
            return $"{PublicBase}{uri.AbsolutePath}";

        if (url.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
            return $"https://{url["http://".Length..]}";

        return url;
    }
}
