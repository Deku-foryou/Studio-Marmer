import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { getAdminCategories } from '@/lib/data/admin/products';
import { ProductForm } from '../ProductForm';

export const metadata: Metadata = {
  title: 'Tambah Produk',
};

/** Product create — Server Component. Loads categories, renders the form. */
export default async function NewProductPage() {
  const categories = await getAdminCategories();

  return (
    <main className="max-w-4xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
      <Link
        href="/admin/produk"
        className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#666666] hover:text-[#1A1A1A] transition-colors font-medium mb-5"
      >
        <ArrowLeft size={12} strokeWidth={1.5} aria-hidden="true" />
        Kembali ke Produk
      </Link>

      <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-1.5">
        Produk
      </span>
      <h1 className="text-2xl font-light text-[#1A1A1A] tracking-tight mb-1.5">
        Tambah Produk
      </h1>
      <p className="text-xs text-[#999999] font-light mb-7">
        URL produk dibuat otomatis dari nama dan tidak berubah saat produk
        disimpan ulang.
      </p>

      {categories.length === 0 ? (
        <div className="border border-[#C4553D]/40 bg-[#C4553D]/5 px-5 py-4">
          <p className="text-xs text-[#C4553D] leading-relaxed">
            Belum ada kategori. Tambahkan kategori terlebih dahulu sebelum
            membuat produk.
          </p>
        </div>
      ) : (
        <ProductForm categories={categories} />
      )}
    </main>
  );
}
