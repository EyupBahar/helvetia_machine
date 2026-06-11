const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Bir hata oluştu." }));
    throw new Error(error.message ?? error.title ?? "Bir hata oluştu.");
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const api = {
  categories: {
    getAll: () => request<import("./types").Category[]>("/categories"),
    getBySlug: (slug: string) =>
      request<import("./types").Category>(`/categories/${slug}`),
    create: (data: import("./types").CreateCategoryRequest, token: string) =>
      request<import("./types").Category>("/categories", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(data),
      }),
    update: (id: number, data: import("./types").CreateCategoryRequest, token: string) =>
      request<import("./types").Category>(`/categories/${id}`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify(data),
      }),
    delete: (id: number, token: string) =>
      request<void>(`/categories/${id}`, {
        method: "DELETE",
        headers: authHeaders(token),
      }),
  },

  subCategories: {
    getAll: (categorySlug?: string) => {
      const query = categorySlug ? `?categorySlug=${categorySlug}` : "";
      return request<import("./types").SubCategory[]>(`/subcategories${query}`);
    },
    getBySlug: (categorySlug: string, slug: string) =>
      request<import("./types").SubCategory>(
        `/subcategories/${categorySlug}/${slug}`
      ),
    create: (data: import("./types").CreateSubCategoryRequest, token: string) =>
      request<import("./types").SubCategory>("/subcategories", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(data),
      }),
    update: (
      id: number,
      data: import("./types").CreateSubCategoryRequest,
      token: string
    ) =>
      request<import("./types").SubCategory>(`/subcategories/${id}`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify(data),
      }),
    delete: (id: number, token: string) =>
      request<void>(`/subcategories/${id}`, {
        method: "DELETE",
        headers: authHeaders(token),
      }),
  },

  auth: {
    login: (username: string, password: string) =>
      request<import("./types").LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
  },

  images: {
    upload: async (file: File, token: string) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_BASE}/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Resim yüklenemedi." }));
        throw new Error(error.message ?? "Resim yüklenemedi.");
      }
      return response.json() as Promise<import("./types").UploadImageResponse>;
    },
    delete: async (url: string, token: string) => {
      const response = await fetch(`${API_BASE}/images?url=${encodeURIComponent(url)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({ message: "Resim silinemedi." }));
        throw new Error(error.message ?? "Resim silinemedi.");
      }
    },
  },
};
