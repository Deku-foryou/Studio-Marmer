import { ReactNode } from 'react';
import { FilterProvider } from '@/context/FilterContext';
import Pagination from './Pagination';
import FilterBar from '../filters/FilterBar';
import { PackageSearch } from 'lucide-react';
import type { CatalogCategory, CatalogPage } from '../../types/product';

interface ProductGridProps {
  /**
   * The page of products, already rendered to markup by the Server Component
   * that owns this tree (see app/(store)/page.tsx).
   *
   * It arrives as a slot rather than as a `products` array on purpose. A card
   * rendered inside a Client Component would be compiled into the client bundle
   * and hydrated, which is pure waste for markup with no behaviour.
   */
  cards: ReactNode;
  /** Whether the page came back empty — decides the empty state below. */
  isEmpty: boolean;
  /**
   * Whether any filter, sort or search is active — the other half of the empty
   * state. Supplied by the Server Component, which already parsed the same URL.
   */
  hasActiveFilters: boolean;
  /** Categories loaded on the server. */
  categories: CatalogCategory[];
  /** Counts and page geometry for the result set the grid is showing. */
  pagination: CatalogPage;
}

/**
 * Server Component that renders one page of the catalog.
 *
 * WHY THIS IS NOT A CLIENT COMPONENT
 * It is the last thing standing between the product grid and a clean server
 * render. The grid itself is markup: no state, no handlers, no browser APIs. But
 * this component used to read `useFilter()` for one boolean, which forced the
 * whole tree — the cards, the section wrapper, the static catalog heading — to
 * sit inside a client boundary and be hydrated on every load.
 *
 * That boolean does not need the client. The filter state is a pure projection
 * of the URL, and the Server Component has already parsed that URL into `query`.
 * So it is passed in as a prop, this component drops `useFilter()`, and the
 * grid renders on the server with nothing to hydrate.
 *
 * Only `FilterBar` genuinely needs the context, so `FilterProvider` is mounted
 * here around the filter bar alone rather than around the entire catalog
 * section. `Pagination` reads `useSearchParams` directly and needs no provider,
 * and the product cards need nothing at all.
 *
 * All product data arrives from a Server Component — this component performs no
 * database access, and must never import Prisma. Filtering and paging are
 * server-side.
 */
export default function ProductGrid({
  cards,
  isEmpty,
  hasActiveFilters,
  categories,
  pagination,
}: ProductGridProps) {
  const { total, currentPage, totalPages } = pagination;

  return (
    <section aria-label="Katalog produk">
      {/* ─── Filters ──────────────────────────────────────── */}
      <div className="mb-8">
        <FilterProvider>
          <FilterBar pagination={pagination} categories={categories} />
        </FilterProvider>
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