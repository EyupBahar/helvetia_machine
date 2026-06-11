import Link from "next/link";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";
import { Category } from "@/lib/types";
import MediaPreview from "@/components/ui/MediaPreview";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let categories: Category[] = [];
  try {
    categories = await api.categories.getAll();
  } catch {
    categories = [];
  }

  return (
    <>
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Endüstriyel Makine Çözümlerinde Güvenilir Partneriniz
            </h1>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              Helvetia olarak, yüksek kaliteli makine ekipmanları, yedek parçalar ve
              servis hizmetleri ile üretim süreçlerinizi optimize ediyoruz.
            </p>
            <div className="flex flex-wrap gap-4">
              {categories.length > 0 && (
                <Button href={`/urunler/${categories[0].slug}`}>
                  Ürünleri Keşfet
                </Button>
              )}
              <Button href="/iletisim" variant="secondary" className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20">
                Bize Ulaşın
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Ürün Kategorileri</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/urunler/${category.slug}`}
              className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-red-300 hover:shadow-lg transition-all"
            >
              {category.imageUrl ? (
                <div className="relative h-40">
                  <MediaPreview src={category.imageUrl} alt={category.name} fill />
                </div>
              ) : (
                <div className="p-8 pb-0">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-red-700 transition-colors">
                    <svg className="w-6 h-6 text-red-700 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                </div>
              )}
              <div className="p-8 pt-4">
              <h3 className="text-xl font-semibold text-gray-900 group-hover:text-red-700 transition-colors">
                {category.name}
              </h3>
              {category.description && (
                <p className="text-sm text-gray-600 mt-2">{category.description}</p>
              )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-red-700">25+</p>
              <p className="text-gray-600 mt-1">Yıllık Deneyim</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-700">500+</p>
              <p className="text-gray-600 mt-1">Mutlu Müşteri</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-700">1000+</p>
              <p className="text-gray-600 mt-1">Ürün Çeşidi</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
