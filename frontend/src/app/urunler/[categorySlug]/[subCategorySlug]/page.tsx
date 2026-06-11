import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import SubCategoryGallery from "@/components/products/SubCategoryGallery";

interface Props {
  params: Promise<{ categorySlug: string; subCategorySlug: string }>;
}

export default async function SubCategoryPage({ params }: Props) {
  const { categorySlug, subCategorySlug } = await params;

  let subCategory;

  try {
    subCategory = await api.subCategories.getBySlug(categorySlug, subCategorySlug);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-red-700">Ana Sayfa</Link>
        <span className="mx-2">/</span>
        <Link href={`/urunler/${categorySlug}`} className="hover:text-red-700">
          {subCategory.categoryName}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{subCategory.name}</span>
      </nav>
      <SubCategoryGallery
        images={subCategory.images}
        title={subCategory.name}
        subtitle={subCategory.description}
      />
    </div>
  );
}
