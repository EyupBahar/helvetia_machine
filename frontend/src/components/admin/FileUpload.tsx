"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { isPdfFile, getFileName } from "@/lib/media";
import Button from "@/components/ui/Button";
import MediaPreview from "@/components/ui/MediaPreview";

interface FileUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  required?: boolean;
}

const ACCEPTED_FILES = "image/jpeg,image/png,image/webp,image/gif,image/bmp,image/svg+xml,application/pdf,.pdf";

export default function FileUpload({ value, onChange, label = "Dosya", required = false }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = getToken();
    if (!token) {
      setError("Oturum bulunamadı.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const result = await api.images.upload(file, token);
      if (value) {
        await api.images.delete(value, token).catch(() => undefined);
      }
      onChange(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yükleme başarısız.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    const token = getToken();
    if (!token) return;

    setUploading(true);
    setError("");
    try {
      await api.images.delete(value, token);
      onChange("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silme başarısız.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}{required && " *"}
      </label>
      <p className="text-xs text-gray-500">JPEG, PNG, WEBP, GIF, BMP, SVG veya PDF (max 10 MB)</p>

      {value ? (
        <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-200">
          <MediaPreview src={value} alt="Önizleme" fill />
          {isPdfFile(value) && (
            <p className="absolute bottom-2 left-2 right-2 text-xs text-gray-600 bg-white/90 rounded px-2 py-1 truncate">
              {getFileName(value)}
            </p>
          )}
        </div>
      ) : (
        <div className="w-full h-40 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-500">Henüz dosya seçilmedi</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_FILES}
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Yükleniyor..." : value ? "Dosyayı Değiştir" : "Bilgisayardan Seç"}
        </Button>
        {value && (
          <Button type="button" variant="danger" disabled={uploading} onClick={handleRemove}>
            Dosyayı Sil
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
