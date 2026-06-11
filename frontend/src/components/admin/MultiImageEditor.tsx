"use client";

import { useRef, useState } from "react";
import { SubCategoryImageInput } from "@/lib/types";
import FileUpload from "@/components/admin/FileUpload";
import Button from "@/components/ui/Button";
import MediaPreview from "@/components/ui/MediaPreview";
import { getFileName, isPdfFile } from "@/lib/media";

interface EditorImage extends SubCategoryImageInput {
  clientKey: string;
}

interface MultiImageEditorProps {
  initialItems?: SubCategoryImageInput[];
  onChange: (items: SubCategoryImageInput[]) => void;
}

const toOutput = (items: EditorImage[]): SubCategoryImageInput[] =>
  items.map(({ id, title, description, imageUrl }) => ({
    id,
    title,
    description,
    imageUrl,
  }));

const initItems = (initialItems?: SubCategoryImageInput[]): EditorImage[] =>
  (initialItems ?? [])
    .filter((item) => item.imageUrl)
    .map((item) => ({
      ...item,
      clientKey: item.id > 0 ? `existing-${item.id}` : `item-${crypto.randomUUID()}`,
    }));

const emptyItem = (clientKey: string): EditorImage => ({
  id: 0,
  title: "",
  description: "",
  imageUrl: "",
  clientKey,
});

export default function MultiImageEditor({ initialItems, onChange }: MultiImageEditorProps) {
  const [items, setItems] = useState<EditorImage[]>(() => initItems(initialItems));
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const listEndRef = useRef<HTMLDivElement>(null);

  const updateItems = (next: EditorImage[]) => {
    setItems(next);
    onChange(toOutput(next));
  };

  const isExpanded = (item: EditorImage) => expandedKeys.has(item.clientKey);

  const expandItem = (clientKey: string) => {
    setExpandedKeys((prev) => new Set(prev).add(clientKey));
  };

  const collapseItem = (clientKey: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      next.delete(clientKey);
      return next;
    });
  };

  const updateItem = (index: number, field: keyof SubCategoryImageInput, value: string | number) => {
    updateItems(
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (index: number) => {
    const item = items[index];
    updateItems(items.filter((_, i) => i !== index));
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      next.delete(item.clientKey);
      return next;
    });
  };

  const addItem = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const clientKey = `new-${crypto.randomUUID()}`;
    updateItems([...items, emptyItem(clientKey)]);
    setExpandedKeys((prev) => new Set(prev).add(clientKey));
    requestAnimationFrame(() => listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="block text-sm font-medium text-gray-700">Görseller / Özellikler</span>
          {items.length > 0 && (
            <span className="text-xs text-gray-500">{items.length} görsel</span>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="!px-3 !py-1.5 text-xs shrink-0"
          onClick={addItem}
        >
          + Görsel Ekle
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4 text-center">
          Henüz görsel eklenmedi. &quot;+ Görsel Ekle&quot; ile başlayın.
        </p>
      )}

      {items.map((item, index) => {
        if (isExpanded(item)) {
          return (
            <div
              key={item.clientKey}
              className="border border-red-200 rounded-xl p-4 space-y-3 bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {item.imageUrl ? "Görsel Düzenle" : "Yeni Görsel"}
                </span>
                <div className="flex gap-2">
                  {item.imageUrl && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="!px-2 !py-1 text-xs"
                      onClick={() => collapseItem(item.clientKey)}
                    >
                      Kapat
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="danger"
                    className="!px-2 !py-1 text-xs"
                    onClick={() => removeItem(index)}
                  >
                    Kaldır
                  </Button>
                </div>
              </div>
              <input
                type="text"
                placeholder="Başlık"
                value={item.title}
                onChange={(e) => updateItem(index, "title", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm bg-white"
              />
              <textarea
                placeholder="Açıklama / Özellikler"
                rows={2}
                value={item.description}
                onChange={(e) => updateItem(index, "description", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none text-sm bg-white"
              />
              <FileUpload
                value={item.imageUrl}
                onChange={(url) => updateItem(index, "imageUrl", url)}
                label="Dosya"
              />
            </div>
          );
        }

        return (
          <div
            key={item.clientKey}
            className="flex items-center gap-3 border border-gray-200 rounded-xl p-3 bg-white"
          >
            <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200 shrink-0">
              <MediaPreview src={item.imageUrl} alt={item.title || "Görsel"} fill />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {item.title || "Başlıksız görsel"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {isPdfFile(item.imageUrl) ? getFileName(item.imageUrl) : item.description || "Açıklama yok"}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                type="button"
                variant="secondary"
                className="!px-2 !py-1 text-xs"
                onClick={() => expandItem(item.clientKey)}
              >
                Düzenle
              </Button>
              <Button
                type="button"
                variant="danger"
                className="!px-2 !py-1 text-xs"
                onClick={() => removeItem(index)}
              >
                Sil
              </Button>
            </div>
          </div>
        );
      })}

      <div ref={listEndRef} />
    </div>
  );
}
