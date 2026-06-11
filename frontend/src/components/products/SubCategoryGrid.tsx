"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SubCategory, SubCategoryImageInput } from "@/lib/types";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { useCategories } from "@/context/CategoriesContext";
import Button from "@/components/ui/Button";
import MultiImageEditor from "@/components/admin/MultiImageEditor";
import MediaPreview from "@/components/ui/MediaPreview";

interface SubCategoryGridProps {
  subCategories: SubCategory[];
  categorySlug: string;
  categoryName: string;
}

export default function SubCategoryGrid({
  subCategories: initialSubCategories,
  categorySlug,
  categoryName,
}: SubCategoryGridProps) {
  const [subCategories, setSubCategories] = useState(initialSubCategories);
  const [editing, setEditing] = useState<SubCategory | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    categoryId: 0,
    images: [] as SubCategoryImageInput[],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { isAdmin } = useAuth();
  const { categories, refreshCategories } = useCategories();
  const router = useRouter();

  const openEdit = (sub: SubCategory) => {
    setEditing(sub);
    setForm({
      name: sub.name,
      description: sub.description ?? "",
      categoryId: sub.categoryId,
      images: (sub.images ?? []).map((img) => ({
        id: img.id,
        title: img.title,
        description: img.description,
        imageUrl: img.imageUrl,
      })),
    });
    setError("");
  };

  const closeEdit = () => {
    setEditing(null);
    setError("");
  };

  const syncSiteCatalog = async () => {
    await refreshCategories();
    router.refresh();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const token = getToken();
    if (!token) {
      setError("Oturum süresi dolmuş. Lütfen tekrar giriş yapın.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const updated = await api.subCategories.update(
        editing.id,
        {
          name: form.name,
          description: form.description,
          categoryId: form.categoryId,
          images: form.images.filter((img) => img.imageUrl),
        },
        token
      );
      setSubCategories((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
          .filter((s) => s.categorySlug === categorySlug)
      );
      closeEdit();
      await syncSiteCatalog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Güncelleme başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sub: SubCategory) => {
    if (!confirm(`"${sub.name}" alt kategorisini silmek istediğinize emin misiniz?`)) return;
    const token = getToken();
    if (!token) {
      setError("Oturum süresi dolmuş. Lütfen tekrar giriş yapın.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.subCategories.delete(sub.id, token);
      setSubCategories((prev) => prev.filter((s) => s.id !== sub.id));
      await syncSiteCatalog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silme başarısız.");
    } finally {
      setLoading(false);
    }
  };

  if (subCategories.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        Bu kategoride henüz alt kategori bulunmuyor.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{categoryName}</h1>
      <p className="text-gray-600 mb-8">Alt kategorileri seçerek ürün özelliklerini görüntüleyin.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {subCategories.map((sub) => {
          const cover = (sub.images ?? [])[0];
          return (
            <div
              key={sub.id}
              className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-red-300 hover:shadow-md transition-all"
            >
              <Link href={`/urunler/${categorySlug}/${sub.slug}`} className="block">
                {cover && (
                  <div className="relative h-32">
                    <MediaPreview src={cover.imageUrl} alt={cover.title} fill />
                  </div>
                )}
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-red-700 transition-colors">
                    {sub.name}
                  </h2>
                  {sub.description && (
                    <p className="text-sm text-gray-600 mt-2">{sub.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">{(sub.images ?? []).length} görsel</p>
                  <span className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-red-700">
                    Detayları Gör
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>

              {isAdmin && (
                <div className="flex gap-2 px-6 pb-6 pt-0">
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-3 !py-1.5 text-xs flex-1"
                    disabled={loading}
                    onClick={(e) => {
                      e.preventDefault();
                      openEdit(sub);
                    }}
                  >
                    Düzenle
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="!px-3 !py-1.5 text-xs flex-1"
                    disabled={loading}
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(sub);
                    }}
                  >
                    Sil
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-auto max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Alt Kategori Düzenle</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleUpdate} className="space-y-4">
              <input
                type="text"
                placeholder="Alt Kategori Adı"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
              <textarea
                placeholder="Açıklama"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
              />
              <select
                required
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <MultiImageEditor
                key={editing.id}
                initialItems={form.images}
                onChange={(images) => setForm((prev) => ({ ...prev, images }))}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Kaydediliyor..." : "Güncelle"}
                </Button>
                <Button type="button" variant="secondary" onClick={closeEdit} disabled={loading}>
                  İptal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
