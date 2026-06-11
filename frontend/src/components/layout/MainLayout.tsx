import Header from "./Header";
import Footer from "./Footer";
import { api } from "@/lib/api";
import { Category } from "@/lib/types";
import { CategoriesProvider } from "@/context/CategoriesContext";

export const dynamic = "force-dynamic";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let categories: Category[] = [];
  try {
    categories = await api.categories.getAll();
  } catch {
    categories = [];
  }

  return (
    <CategoriesProvider initialCategories={categories}>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </CategoriesProvider>
  );
}
