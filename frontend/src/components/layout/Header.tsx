"use client";

import Link from "next/link";
import { useState } from "react";
import { Category } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps {
  categories: Category[];
}

const navLinks = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/iletisim", label: "İletişim" },
];

export default function Header({ categories }: HeaderProps) {
  const [productsOpen, setProductsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Helvetia</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {link.label}
              </Link>
            ))}

            <div
              className="relative"
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
              >
                Ürünler
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {productsOpen && categories.length > 0 && (
                <div className="absolute top-full left-0 w-64 pt-2">
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 py-2">
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/urunler/${category.slug}`}
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-2">
            {isAdmin ? (
              <>
                <Link
                  href="/admin/dashboard"
                  className="hidden sm:inline px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Yönetim
                </Link>
                <button
                  onClick={logout}
                  className="p-2 text-gray-500 hover:text-red-700 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Çıkış Yap"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </>
            ) : (
              <Link
                href="/admin/login"
                className="p-2 text-gray-500 hover:text-red-700 hover:bg-gray-50 rounded-lg transition-colors"
                title="Admin Girişi"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>
            )}

            <button
              className="md:hidden p-2 text-gray-500 hover:text-red-700 rounded-lg"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menü"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="md:hidden border-t border-gray-200 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-red-700 hover:bg-gray-50 rounded-lg"
              >
                {link.label}
              </Link>
            ))}
            <div className="px-4 pt-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ürünler</p>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/urunler/${category.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 text-sm text-gray-700 hover:text-red-700"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
