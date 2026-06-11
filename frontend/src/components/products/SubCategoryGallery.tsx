import { SubCategoryImage } from "@/lib/types";
import MediaPreview from "@/components/ui/MediaPreview";

interface SubCategoryGalleryProps {
  images: SubCategoryImage[];
  title: string;
  subtitle?: string;
}

export default function SubCategoryGallery({ images, title, subtitle }: SubCategoryGalleryProps) {
  if (images.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        {subtitle && <p className="text-gray-600 mb-8">{subtitle}</p>}
        <div className="text-center py-16 text-gray-500">
          Bu alt kategoride henüz görsel veya özellik bilgisi bulunmuyor.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
      {subtitle && <p className="text-gray-600 mb-8">{subtitle}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((item) => (
          <article key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-48 bg-gray-100">
              <MediaPreview src={item.imageUrl} alt={item.title} fill />
            </div>
            <div className="p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
