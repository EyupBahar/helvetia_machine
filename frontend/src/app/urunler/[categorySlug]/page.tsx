import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import SubCategoryGrid from "@/components/products/SubCategoryGrid";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ categorySlug: string }>;
}

export default async function CategoryPage({ params }: Props) {
  const { categorySlug } = await params;

  let category;
  let subCategories;

  try {
    [category, subCategories] = await Promise.all([
      api.categories.getBySlug(categorySlug),
      api.subCategories.getAll(categorySlug),
    ]);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-red-700">Ana Sayfa</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{category.name}</span>
      </nav>
      <SubCategoryGrid
        subCategories={subCategories}
        categorySlug={categorySlug}
        categoryName={category.name}
      />
    </div>
  );
}
