'use client';

import { useFilter } from '@/context/FilterContext';
import type { ReactNode } from 'react';
import Pagination from './Pagination';
import FilterBar from '../filters/FilterBar';
import { PackageSearch } from 'lucide-react';
import type {
  CatalogCategory,
  CatalogPage,
} from '../../types/product';

interface ProductGridProps {
  /**
   * The page of products, already rendered to markup by the Server Component
   * that owns this tree (see app/(store)/page.tsx).
   *
   * It arrives as a slot rather than as a `products` array on purpose. A card
   * rendered inside this Client Component would be compiled into the client
   * bundle and hydrated, which is pure waste for markup with no behaviour. This
   * way nothing about a card is shipped, and the products are not serialized a
   * second time as a JSON prop either.
   */
  cards: ReactNode;
  /** Whether the page came back empty — decides the empty state below. */
  isEmpty: boolean;
  /** Categories loaded on the server. */
  categories: CatalogCategory[];
  /** Counts and page geometry for the result set the grid is showing. */
  pagination: CatalogPage;
}

/**
 * Client component that renders one page of the catalog.
 *
 * Owns only what genuinely needs the browser: the filter bar, the pagination
 * links, and the two empty-state messages that depend on whether filters are
 * active. The products themselves are already-rendered markup from the server.
 *
 * All product data arrives from a Server Component - this component performs no
 * database access, and must never import Prisma. Filtering and paging are
 * server-side, so the only state it owns is what FilterBar and Pagination need
 * to drive navigation.
 */
export default function ProductGrid({
  cards,
  isEmpty,
  categories,
  pagination,
}: ProductGridProps) {
  const { total, currentPage, totalPages } = pagination;
  const { filters } = useFilter();

  // An empty grid means two very different things, and conflating them would
  // tell a visitor to change filters they never set. With nothing active, the
  // catalog itself is simply empty - which is the storefront's normal state
  // before the client's catalog is published.
  const hasActiveFilters =
    filters.selectedCategories.length > 0 ||
    filters.showInStockOnly ||
    filters.selectedSort !== 'featured' ||
    filters.searchQuery.trim() !== '';

  return (
    <section aria-label="Katalog produk">
      {/* ─── Filters ──────────────────────────────────────── */}
      <div className="mb-8">
        <FilterBar pagination={pagination} categories={categories} />
      </div>

      {/* ─── Grid ─────────────────────────────────────────── */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="w-20 h-20 border border-[#E5E1DA] bg-white rounded-none flex items-center justify-center">
            <PackageSearch size={32} className="text-[#999999]" />
          </div>
          <div className="text-center">
            <p className="text-lg font-light text-[#1A1A1A] mb-2">
              {hasActiveFilters
                ? 'Produk tidak ditemukan'
                : 'Katalog sedang disiapkan'}
            </p>
            <p className="text-sm text-[#666666] font-light">
              {hasActiveFilters
                ? 'Coba ubah kata kunci pencarian atau filter yang dipilih.'
                : 'Belum ada produk yang dipublikasikan. Silakan hubungi kami untuk menanyakan ketersediaan.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            role="list"
            aria-label="Daftar produk"
          >
            {cards}
          </div>

          {/* ─── Pagination ────────────────────────────────── */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={total}
          />
        </>
      )}
    </section>
  );
}