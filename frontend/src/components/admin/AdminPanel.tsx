"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Category, SubCategory, SubCategoryImageInput } from "@/lib/types";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import Button from "@/components/ui/Button";
import FileUpload from "@/components/admin/FileUpload";
import MultiImageEditor from "@/components/admin/MultiImageEditor";

type Tab = "categories" | "subcategories";

interface AdminPanelProps {
  initialCategories: Category[];
  initialSubCategories: SubCategory[];
}

export default function AdminPanel({
  initialCategories,
  initialSubCategories,
}: AdminPanelProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("categories");
  const [categories, setCategories] = useState(initialCategories);
  const [subCategories, setSubCategories] = useState(initialSubCategories);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);

  const token = getToken()!;

  const refreshData = async () => {
    const [cats, subs] = await Promise.all([
      api.categories.getAll(),
      api.subCategories.getAll(),
    ]);
    setCategories(cats);
    setSubCategories(subs);
  };

  useEffect(() => {
    refreshData().catch(() => {
      // Keep SSR fallback data if live refresh fails.
    });
  }, []);

  useEffect(() => {
    setCategories(initialCategories);
    setSubCategories(initialSubCategories);
  }, [initialCategories, initialSubCategories]);

  useEffect(() => {
    if (categories.length === 0) return;

    setSubCategoryForm((prev) => {
      const hasValidCategory = categories.some((c) => c.id === prev.categoryId);
      if (hasValidCategory) return prev;
      return { ...prev, categoryId: categories[0].id };
    });
  }, [categories]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  const [categoryForm, setCategoryForm] = useState({ id: 0, name: "", description: "", imageUrl: "" });
  const [editingCategory, setEditingCategory] = useState(false);

  const [subCategoryForm, setSubCategoryForm] = useState({
    id: 0,
    name: "",
    description: "",
    categoryId: categories[0]?.id ?? 0,
    images: [] as SubCategoryImageInput[],
  });
  const [editingSubCategory, setEditingSubCategory] = useState(false);

  const resetCategoryForm = () => {
    setCategoryForm({ id: 0, name: "", description: "", imageUrl: "" });
    setEditingCategory(false);
  };

  const resetSubCategoryForm = () => {
    setSubCategoryForm({
      id: 0,
      name: "",
      description: "",
      categoryId: categories[0]?.id ?? 0,
      images: [],
    });
    setEditingSubCategory(false);
    setFormResetKey((key) => key + 1);
  };

  const mapImages = (images: SubCategory["images"]): SubCategoryImageInput[] =>
    (images ?? []).map((img) => ({
      id: img.id,
      title: img.title,
      description: img.description,
      imageUrl: img.imageUrl,
    }));

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (editingCategory) {
        const updated = await api.categories.update(categoryForm.id, {
          name: categoryForm.name,
          description: categoryForm.description,
          imageUrl: categoryForm.imageUrl,
        }, token);
        setCategories(categories.map((c) => (c.id === updated.id ? updated : c)));
        showSuccess("Kategori güncellendi.");
      } else {
        const created = await api.categories.create({
          name: categoryForm.name,
          description: categoryForm.description,
          imageUrl: categoryForm.imageUrl,
        }, token);
        setCategories([...categories, created]);
        showSuccess("Kategori eklendi.");
      }
      resetCategoryForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    }
  };

  const handleSubCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!subCategoryForm.categoryId) {
      setError("Lütfen bir kategori seçin.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: subCategoryForm.name,
        description: subCategoryForm.description,
        categoryId: subCategoryForm.categoryId,
        images: subCategoryForm.images.filter((img) => img.imageUrl),
      };

      if (editingSubCategory) {
        await api.subCategories.update(subCategoryForm.id, payload, token);
        showSuccess("Alt kategori güncellendi.");
      } else {
        await api.subCategories.create(payload, token);
        showSuccess("Alt kategori eklendi.");
      }

      resetSubCategoryForm();
      const fresh = await api.subCategories.getAll();
      setSubCategories(fresh);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "categories", label: "Kategoriler" },
    { key: "subcategories", label: "Alt Kategoriler" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Yönetim Paneli</h1>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="flex gap-2 mb-8 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-red-700 text-red-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "categories" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form onSubmit={handleCategorySubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold">{editingCategory ? "Kategori Düzenle" : "Yeni Kategori Ekle"}</h2>
            <input
              type="text"
              placeholder="Kategori Adı"
              required
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
            <textarea
              placeholder="Açıklama"
              rows={2}
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
            />
            <FileUpload
              value={categoryForm.imageUrl}
              onChange={(url) => setCategoryForm({ ...categoryForm, imageUrl: url })}
              label="Kategori Görseli / PDF"
            />
            <div className="flex gap-2">
              <Button type="submit">{editingCategory ? "Güncelle" : "Ekle"}</Button>
              {editingCategory && (
                <Button type="button" variant="secondary" onClick={resetCategoryForm}>İptal</Button>
              )}
            </div>
          </form>

          <div className="space-y-3">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
                <div>
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.slug}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-3 !py-1 text-xs"
                    onClick={() => {
                      setTab("categories");
                      setCategoryForm({ id: c.id, name: c.name, description: c.description ?? "", imageUrl: c.imageUrl ?? "" });
                      setEditingCategory(true);
                    }}
                  >
                    Düzenle
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="!px-3 !py-1 text-xs"
                    onClick={async () => {
                      if (!confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) return;
                      await api.categories.delete(c.id, token);
                      setCategories(categories.filter((x) => x.id !== c.id));
                      const fresh = await api.subCategories.getAll();
                      setSubCategories(fresh);
                      showSuccess("Kategori silindi.");
                    }}
                  >
                    Sil
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "subcategories" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <form onSubmit={handleSubCategorySubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold">{editingSubCategory ? "Alt Kategori Düzenle" : "Yeni Alt Kategori Ekle"}</h2>
            <input
              type="text"
              placeholder="Alt Kategori Adı"
              required
              value={subCategoryForm.name}
              onChange={(e) => setSubCategoryForm({ ...subCategoryForm, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
            <textarea
              placeholder="Açıklama"
              rows={2}
              value={subCategoryForm.description}
              onChange={(e) => setSubCategoryForm({ ...subCategoryForm, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
            />
            <select
              required
              value={subCategoryForm.categoryId || ""}
              onChange={(e) => setSubCategoryForm({ ...subCategoryForm, categoryId: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            >
              <option value="" disabled>
                Kategori seçin
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <MultiImageEditor
              key={`subcategory-images-${formResetKey}-${editingSubCategory ? subCategoryForm.id : "new"}`}
              initialItems={subCategoryForm.images}
              onChange={(images) => setSubCategoryForm((prev) => ({ ...prev, images }))}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Kaydediliyor..." : editingSubCategory ? "Güncelle" : "Ekle"}
              </Button>
              {editingSubCategory && (
                <Button type="button" variant="secondary" onClick={resetSubCategoryForm}>İptal</Button>
              )}
            </div>
          </form>

          <div className="space-y-3 max-h-[800px] overflow-y-auto">
            {subCategories.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.categoryName} · {(s.images ?? []).length} görsel</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="!px-3 !py-1 text-xs"
                      onClick={() => {
                        setTab("subcategories");
                        setSubCategoryForm({
                          id: s.id,
                          name: s.name,
                          description: s.description ?? "",
                          categoryId: s.categoryId,
                          images: mapImages(s.images),
                        });
                        setEditingSubCategory(true);
                      }}
                    >
                      Düzenle
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="!px-3 !py-1 text-xs"
                      onClick={async () => {
                        if (!confirm("Bu alt kategoriyi silmek istediğinize emin misiniz?")) return;
                        if (!s.id) {
                          setError("Geçersiz kayıt. Liste yenileniyor...");
                          await refreshData();
                          return;
                        }
                        const authToken = getToken();
                        if (!authToken) {
                          setError("Oturum süresi dolmuş. Lütfen tekrar giriş yapın.");
                          return;
                        }
                        try {
                          await api.subCategories.delete(s.id, authToken);
                          setSubCategories(subCategories.filter((x) => x.id !== s.id));
                          showSuccess("Alt kategori silindi.");
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Silme başarısız.");
                          await refreshData();
                        }
                      }}
                    >
                      Sil
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
