import Image from "next/image";
import { isPdfFile, getFileName, resolveMediaUrl } from "@/lib/media";

interface MediaPreviewProps {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  height?: number;
}

export default function MediaPreview({ src, alt, className = "object-cover", fill, height = 192 }: MediaPreviewProps) {
  const resolvedSrc = resolveMediaUrl(src);

  if (!resolvedSrc) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${fill ? "absolute inset-0" : ""}`} style={fill ? undefined : { height }}>
        <span className="text-sm text-gray-400">Dosya yok</span>
      </div>
    );
  }

  if (isPdfFile(resolvedSrc)) {
    return (
      <div
        className={`bg-red-50 flex flex-col items-center justify-center gap-2 p-4 ${fill ? "absolute inset-0" : ""}`}
        style={fill ? undefined : { height }}
      >
        <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <a href={resolvedSrc} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-red-700 hover:underline text-center">
          PDF Görüntüle
        </a>
        <span className="text-xs text-gray-500 truncate max-w-full">{getFileName(resolvedSrc)}</span>
      </div>
    );
  }

  if (fill) {
    return <Image src={resolvedSrc} alt={alt} fill className={className} unoptimized sizes="(max-width: 768px) 100vw, 33vw" />;
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <Image src={resolvedSrc} alt={alt} fill className={className} unoptimized sizes="(max-width: 768px) 100vw, 33vw" />
    </div>
  );
}
