export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl: string;
}

export interface SubCategoryImage {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
}

export interface SubCategoryImageInput {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
}

export interface SubCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  images: SubCategoryImage[];
}

export interface LoginResponse {
  token: string;
  username: string;
}

export interface UploadImageResponse {
  url: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  imageUrl?: string;
}

export interface CreateSubCategoryRequest {
  name: string;
  description?: string;
  categoryId: number;
  images?: SubCategoryImageInput[];
}
