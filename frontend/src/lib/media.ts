const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api").replace(/\/api\/?$/, "");

export function resolveMediaUrl(url: string): string {
  if (!url) return url;

  if (url.startsWith("/uploads/")) {
    return `${API_ORIGIN}${url}`;
  }

  if (url.startsWith("http://")) {
    return `https://${url.slice("http://".length)}`;
  }

  return url;
}

export function isPdfFile(url: string): boolean {
  if (!url) return false;
  try {
    const path = new URL(resolveMediaUrl(url)).pathname.toLowerCase();
    return path.endsWith(".pdf");
  } catch {
    return url.toLowerCase().endsWith(".pdf");
  }
}

export function isImageFile(url: string): boolean {
  if (!url || isPdfFile(url)) return false;
  return /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(url.split("?")[0]);
}

export function getFileName(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "dosya");
  } catch {
    return url.split("/").pop() ?? "dosya";
  }
}
