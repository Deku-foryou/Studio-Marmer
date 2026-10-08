'use client';

import { useFilter } from '@/context/FilterContext';
import type { SortOption } from '@/types/product';
import type { CatalogCategory, CatalogPage } from '@/types/product';
import { SlidersHorizontal, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Pilihan Kami' },
  { value: 'price-asc', label: 'Harga: Terendah' },
  { value: 'price-desc', label: 'Harga: Tertinggi' },
  { value: 'trending', label: 'Unggulan' },
];

/**
 * Sort order options.
 *
 * Categories carry no icon: the buttons are text-only, which keeps the filter
 * row consistent with the rest of the type-led design and avoids leaning on
 * emoji as category art.
 */

interface FilterBarProps {
  /**
   * Page geometry for the current result set, supplied by the server.
   * `total` counts everything matching the filters, not just this page.
   */
  pagination: CatalogPage;
  /** Active categories, supplied by the server from the database. */
  categories: CatalogCategory[];
}

export default function FilterBar({ pagination, categories }: FilterBarProps) {
  const { filters, toggleCategory, setSort, toggleInStock, clearFilters } =
    useFilter();

  const { total, currentPage, totalPages, pageSize } = pagination;
  const firstShown = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastShown = Math.min(currentPage * pageSize, total);

  const hasActiveFilters =
    filters.selectedCategories.length > 0 ||
    filters.showInStockOnly ||
    filters.selectedSort !== 'featured';

  return (
    <div className="space-y-6">
      {/* ─── Row 1: Categories ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const isActive = filters.selectedCategories.includes(cat.slug);
          return (
            <button
              key={cat.id}
              id={`filter-${cat.slug}`}
              onClick={() => toggleCategory(cat.slug)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 border text-xs uppercase tracking-wider transition-all duration-200 rounded-none',
                isActive
                  ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                  : 'border-[#E5E1DA] bg-white text-[#666666] hover:text-[#1A1A1A] hover:border-[#1A1A1A]'
              )}
              aria-pressed={isActive}
              aria-label={`Filter kategori ${cat.name}`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* ─── Row 2: Sort + In-Stock + Results ──────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 justify-between border-t border-b border-[#E5E1DA] py-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Sort Dropdown */}
          <div className="relative flex items-center gap-2">
            <SlidersHorizontal size={12} className="text-[#999999]" />
            <select
              id="sort-select"
              value={filters.selectedSort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="bg-white border border-[#E5E1DA] text-xs uppercase tracking-wider text-[#1A1A1A] pl-3 pr-8 py-2 appearance-none cursor-pointer rounded-none outline-none focus:border-[#1A1A1A] transition-colors"
              aria-label="Urutkan produk"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%231A1A1A' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-white text-[#1A1A1A] text-sm normal-case"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* In Stock Toggle */}
          <button
            id="instock-filter"
            onClick={toggleInStock}
            className={cn(
              'flex items-center gap-2 px-4 py-2 border text-xs uppercase tracking-wider transition-all duration-200 rounded-none',
              filters.showInStockOnly
                ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                : 'bg-white border-[#E5E1DA] text-[#666666] hover:text-[#1A1A1A] hover:border-[#1A1A1A]'
            )}
            aria-pressed={filters.showInStockOnly}
            aria-label="Tampilkan produk yang tersedia saja"
          >
            <CheckSquare size={12} className={cn(filters.showInStockOnly ? 'text-white' : 'text-[#999999]')} />
            Tersedia Saja
          </button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              id="clear-filters"
              onClick={clearFilters}
              className="text-xs uppercase tracking-wider text-[#999999] hover:text-[#1A1A1A] transition-colors underline underline-offset-4"
            >
              Hapus Filter
            </button>
          )}
        </div>

        {/* Result Count — reflects the filtered result set and the slice of it
            currently on screen, so page 2 of 9 products reads "1–1 dari 9". */}
        <p className="text-xs uppercase tracking-wider text-[#999999]">
          Menampilkan{' '}
          <span className="text-[#1A1A1A] font-semibold">
            {firstShown}–{lastShown}
          </span>{' '}
          dari{' '}
          <span className="text-[#1A1A1A] font-semibold">{total}</span> produk
          {totalPages > 1 && (
            <span className="text-[#C9C4BC]"> · halaman {currentPage}</span>
          )}
        </p>
      </div>
    </div>
  );
}
