import AdminGuard from "@/components/admin/AdminGuard";
import AdminPanel from "@/components/admin/AdminPanel";
import { api } from "@/lib/api";
import { Category, SubCategory } from "@/lib/types";

export default async function AdminDashboardPage() {
  let categories: Category[] = [];
  let subCategories: SubCategory[] = [];

  try {
    [categories, subCategories] = await Promise.all([
      api.categories.getAll(),
      api.subCategories.getAll(),
    ]);
  } catch {
    // Admin panel will show empty state if API is unavailable
  }

  return (
    <AdminGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AdminPanel
          initialCategories={categories}
          initialSubCategories={subCategories}
        />
      </div>
    </AdminGuard>
  );
}
