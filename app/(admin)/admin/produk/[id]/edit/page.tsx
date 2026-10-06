import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, CheckCircle2 } from 'lucide-react';

import { getAdminCategories, getAdminProductById } from '@/lib/data/admin/products';
import { ProductForm } from '../../ProductForm';

export const metadata: Metadata = {
  title: 'Edit Produk',
};

interface EditProductPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}

/** Product edit — Server Component. Loads product + categories for the form. */
export default async function EditProductPage({
  params,
  searchParams,
}: EditProductPageProps) {
  const { id } = await params;
  const { created } = await searchParams;

  const productId = Number(id);

  // Non-numeric ids can never match a row, so short-circuit to a real 404.
  if (!Number.isInteger(productId) || productId <= 0) {
    notFound();
  }

  const [product, categories] = await Promise.all([
    getAdminProductById(productId),
    getAdminCategories(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <main className="max-w-4xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
      <Link
        href="/admin/produk"
        className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#666666] hover:text-[#1A1A1A] transition-colors font-medium mb-5"
      >
        <ArrowLeft size={12} strokeWidth={1.5} aria-hidden="true" />
        Kembali ke Produk
      </Link>

      {created === '1' && (
        <div
          role="status"
          className="flex items-start gap-2.5 border border-[#5C8A5C]/40 bg-[#5C8A5C]/5 px-4 py-3 mb-6"
        >
          <CheckCircle2
            size={15}
            className="text-[#5C8A5C] mt-0.5 flex-shrink-0"
            aria-hidden="true"
          />
          <p className="text-xs text-[#41693F] leading-relaxed">
            Produk berhasil dibuat. Periksa kembali detail di bawah ini.
          </p>
        </div>
      )}

      <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-1.5">
        Produk
      </span>
      <h1 className="text-2xl font-light text-[#1A1A1A] tracking-tight mb-1.5">
        Edit Produk
      </h1>
      <p className="text-xs text-[#999999] font-light mb-7 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>{product.name}</span>
        <Link
          href={`/produk/${product.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[#8B7355] hover:text-[#1A1A1A] transition-colors"
        >
          Lihat di situs
          <ExternalLink size={10} strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </p>

      {categories.length === 0 ? (
        <div className="border border-[#C4553D]/40 bg-[#C4553D]/5 px-5 py-4">
          <p className="text-xs text-[#C4553D] leading-relaxed">
            Belum ada kategori yang dapat dipilih.
          </p>
        </div>
      ) : (
        <ProductForm categories={categories} product={product} />
      )}
    </main>
  );
}
