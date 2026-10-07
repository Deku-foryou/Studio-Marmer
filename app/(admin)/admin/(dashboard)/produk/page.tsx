import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Pencil, PackageSearch } from 'lucide-react';

import {
  getAdminCategories,
  listAdminProducts,
  type AdminProductRow,
} from '@/lib/data/admin/products';
import { formatPrice } from '@/lib/utils';
import { DeleteProductButton } from './DeleteProductButton';

export const metadata: Metadata = {
  title: 'Produk',
};

/**
 * Admin product list — Server Component.
 *
 * All database work happens here (via the admin DAL) so no Client Component
 * ever imports Prisma. Search, category and availability filters are read from
 * the URL so a filtered view is shareable and survives a refresh.
 */

const PAGE_SIZE = 20;

type SearchParams = Promise<{
  q?: string;
  kategori?: string;
  status?: string;
  page?: string;
}>;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function AvailabilityBadge({ product }: { product: AdminProductRow }) {
  return product.isAvailable ? (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[#5C8A5C] font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-[#5C8A5C]" aria-hidden="true" />
      Tersedia
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[#C4553D] font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-[#C4553D]" aria-hidden="true" />
      Stok Habis
    </span>
  );
}

export default async function AdminProductListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const search = (params.q ?? '').trim();
  const categoryId = params.kategori ? Number(params.kategori) : undefined;
  const availability =
    params.status === 'available' || params.status === 'unavailable'
      ? params.status
      : 'all';
  const page = params.page ? Number(params.page) : 1;

  const [categories, result] = await Promise.all([
    getAdminCategories(),
    listAdminProducts({
      search: search || undefined,
      categoryId: Number.isFinite(categoryId) ? categoryId : undefined,
      availability,
      page: Number.isFinite(page) ? page : 1,
    }),
  ]);

  const hasFilters = Boolean(search) || availability !== 'all' || Boolean(categoryId);

  /** Builds a link that keeps the active filters and swaps one parameter. */
  function linkWith(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      q: search || undefined,
      kategori: Number.isFinite(categoryId) ? String(categoryId) : undefined,
      status: availability !== 'all' ? availability : undefined,
      page: undefined,
      ...overrides,
    };

    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }

    const qs = next.toString();
    return qs ? `/admin/produk?${qs}` : '/admin/produk';
  }

  return (
    <main className="max-w-6xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-1.5">
            Modul
          </span>
          <h1 className="text-2xl font-light text-[#1A1A1A] tracking-tight">
            Produk
          </h1>
          <p className="text-xs text-[#999999] mt-1">
            {result.total} produk terdaftar
          </p>
        </div>

        <Link
          href="/admin/produk/tambah"
          className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-5 py-3 text-[11px] uppercase tracking-[0.14em] font-medium hover:bg-[#333333] transition-colors duration-300"
        >
          <Plus size={13} strokeWidth={1.5} aria-hidden="true" />
          Tambah Produk
        </Link>
      </div>

      {/* ─── Filters ────────────────────────────────────────────── */}
      <form
        method="get"
        action="/admin/produk"
        className="border border-[#E5E1DA] bg-white p-4 mb-5 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="q"
            className="block text-[9px] uppercase tracking-[0.16em] text-[#999999] font-medium mb-1.5"
          >
            Cari nama
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Nama produk…"
            className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3 py-2.5 font-light"
          />
        </div>

        <div className="min-w-[160px]">
          <label
            htmlFor="kategori"
            className="block text-[9px] uppercase tracking-[0.16em] text-[#999999] font-medium mb-1.5"
          >
            Kategori
          </label>
          <select
            id="kategori"
            name="kategori"
            defaultValue={Number.isFinite(categoryId) ? String(categoryId) : ''}
            className="w-full border border-[#E5E1DA] bg-white focus:border-[#1A1A1A] outline-none text-[13px] px-3 py-2.5 font-light"
          >
            <option value="">Semua kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[150px]">
          <label
            htmlFor="status"
            className="block text-[9px] uppercase tracking-[0.16em] text-[#999999] font-medium mb-1.5"
          >
            Ketersediaan
          </label>
          <select
            id="status"
            name="status"
            defaultValue={availability}
            className="w-full border border-[#E5E1DA] bg-white focus:border-[#1A1A1A] outline-none text-[13px] px-3 py-2.5 font-light"
          >
            <option value="all">Semua</option>
            <option value="available">Tersedia</option>
            <option value="unavailable">Stok Habis</option>
          </select>
        </div>

        <button
          type="submit"
          className="border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors duration-300 px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] font-medium"
        >
          Terapkan
        </button>

        {hasFilters && (
          <Link
            href="/admin/produk"
            className="text-[11px] uppercase tracking-[0.14em] text-[#999999] hover:text-[#1A1A1A] transition-colors py-2.5"
          >
            Reset
          </Link>
        )}
      </form>

      {/* ─── Table ──────────────────────────────────────────────── */}
      {result.products.length === 0 ? (
        <div className="border border-[#E5E1DA] bg-white py-16 px-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 border border-[#E5E1DA] flex items-center justify-center mb-4">
            <PackageSearch size={24} className="text-[#999999]" aria-hidden="true" />
          </div>
          <p className="text-sm font-light text-[#1A1A1A] mb-1">
            {hasFilters ? 'Produk tidak ditemukan' : 'Belum ada produk'}
          </p>
          <p className="text-xs text-[#999999] font-light mb-5">
            {hasFilters
              ? 'Coba ubah kata kunci atau filter yang dipilih.'
              : 'Tambahkan produk pertama untuk mulai mengisi katalog.'}
          </p>
          {!hasFilters && (
            <Link
              href="/admin/produk/tambah"
              className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-5 py-3 text-[11px] uppercase tracking-[0.14em] font-medium hover:bg-[#333333] transition-colors"
            >
              <Plus size={13} strokeWidth={1.5} aria-hidden="true" />
              Tambah Produk
            </Link>
          )}
        </div>
      ) : (
        <div className="border border-[#E5E1DA] bg-white overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-[#E5E1DA]">
                {['Produk', 'Kategori', 'Harga', 'Status', 'Diperbarui', 'Aksi'].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 text-[9px] uppercase tracking-[0.16em] text-[#999999] font-medium"
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {result.products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-[#E5E1DA] last:border-b-0 hover:bg-[#FBF9F6] transition-colors"
                >
                  {/* Product */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 border border-[#E5E1DA] bg-[#F3F1EE] flex-shrink-0 overflow-hidden">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-[#C9C4BC] text-[9px]">
                            —
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/produk/${product.id}/edit`}
                          className="block text-[13px] font-medium text-[#1A1A1A] hover:underline truncate max-w-[260px]"
                        >
                          {product.name}
                        </Link>
                        <p className="text-[10px] text-[#C9C4BC] truncate max-w-[260px]">
                          /produk/{product.slug}
                        </p>
                        {product.isFeatured && (
                          <span className="inline-block mt-1 text-[9px] uppercase tracking-[0.12em] text-[#8B7355] font-medium">
                            Unggulan
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3 text-xs text-[#666666] font-light whitespace-nowrap">
                    {product.categoryName}
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {product.pricingType === 'STARTING_FROM' && (
                      <span className="block text-[9px] uppercase tracking-[0.12em] text-[#999999]">
                        Mulai dari
                      </span>
                    )}
                    <span className="text-[13px] font-medium text-[#1A1A1A]">
                      {formatPrice(product.price)}
                    </span>
                    {product.originalPrice !== null && (
                      <span className="block text-[11px] text-[#C9C4BC] line-through">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <AvailabilityBadge product={product} />
                    {product.isUniquePiece && (
                      <span className="block mt-1 text-[9px] uppercase tracking-[0.12em] text-[#8B7355] font-medium">
                        Satu-satunya
                      </span>
                    )}
                  </td>

                  {/* Updated */}
                  <td className="px-4 py-3 text-[11px] text-[#999999] font-light whitespace-nowrap">
                    {formatDate(product.updatedAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/produk/${product.id}/edit`}
                        className="inline-flex items-center gap-1.5 border border-[#E5E1DA] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors"
                        aria-label={`Edit ${product.name}`}
                      >
                        <Pencil size={11} strokeWidth={1.5} aria-hidden="true" />
                        Edit
                      </Link>
                      <DeleteProductButton
                        productId={product.id}
                        productName={product.name}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Pagination ─────────────────────────────────────────── */}
      {result.pageCount > 1 && (
        <nav
          aria-label="Navigasi halaman"
          className="mt-5 flex items-center justify-between gap-4"
        >
          <p className="text-[11px] text-[#999999] font-light">
            Halaman {result.page} dari {result.pageCount}
          </p>
          <div className="flex items-center gap-2">
            {result.page > 1 ? (
              <Link
                href={linkWith({ page: String(result.page - 1) })}
                className="border border-[#E5E1DA] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-[#1A1A1A] hover:bg-white transition-colors"
              >
                Sebelumnya
              </Link>
            ) : (
              <span className="border border-[#E5E1DA] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-[#C9C4BC] cursor-not-allowed select-none">
                Sebelumnya
              </span>
            )}

            {result.page < result.pageCount ? (
              <Link
                href={linkWith({ page: String(result.page + 1) })}
                className="border border-[#E5E1DA] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-[#1A1A1A] hover:bg-white transition-colors"
              >
                Berikutnya
              </Link>
            ) : (
              <span className="border border-[#E5E1DA] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-[#C9C4BC] cursor-not-allowed select-none">
                Berikutnya
              </span>
            )}
          </div>
        </nav>
      )}

      <p className="mt-6 text-[10px] text-[#C9C4BC] font-light">
        Menampilkan {PAGE_SIZE} produk per halaman.
      </p>
    </main>
  );
}
