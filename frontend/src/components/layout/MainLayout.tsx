import Header from "./Header";
import Footer from "./Footer";
import { api } from "@/lib/api";
import { Category } from "@/lib/types";

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
    <>
      <Header categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
