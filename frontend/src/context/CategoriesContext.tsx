"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import { Category } from "@/lib/types";

interface CategoriesContextType {
  categories: Category[];
  refreshCategories: () => Promise<Category[]>;
}

const CategoriesContext = createContext<CategoriesContextType | null>(null);

export function CategoriesProvider({
  initialCategories,
  children,
}: {
  initialCategories: Category[];
  children: ReactNode;
}) {
  const [categories, setCategories] = useState(initialCategories);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const refreshCategories = useCallback(async () => {
    const fresh = await api.categories.getAll();
    setCategories(fresh);
    return fresh;
  }, []);

  return (
    <CategoriesContext.Provider value={{ categories, refreshCategories }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error("useCategories must be used within CategoriesProvider");
  }
  return context;
}
