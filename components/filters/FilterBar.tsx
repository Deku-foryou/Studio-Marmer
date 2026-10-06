'use client';

import { useFilter } from '@/context/FilterContext';
import { CATEGORIES } from '@/data/categories';
import type { SortOption } from '@/types/product';
import { SlidersHorizontal, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'trending', label: 'Trending' },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Smartphones: '📱',
  Laptops: '💻',
  Audio: '🎧',
  Wearables: '⌚',
  Cameras: '📷',
  Gaming: '🎮',
  Accessories: '🔌',
};

export default function FilterBar({ resultCount }: { resultCount: number }) {
  const { filters, toggleCategory, setSort, toggleInStock, clearFilters } =
    useFilter();

  const hasActiveFilters =
    filters.selectedCategories.length > 0 ||
    filters.showInStockOnly ||
    filters.selectedSort !== 'featured';

  return (
    <div className="space-y-6">
      {/* ─── Row 1: Categories ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const isActive = filters.selectedCategories.includes(cat);
          return (
            <button
              key={cat}
              id={`filter-${cat.toLowerCase()}`}
              onClick={() => toggleCategory(cat)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 border text-xs uppercase tracking-wider transition-all duration-200 rounded-none',
                isActive
                  ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                  : 'bg-white border-[#E5E1DA] text-[#666666] hover:text-[#1A1A1A] hover:border-[#1A1A1A]'
              )}
              aria-pressed={isActive}
              aria-label={`Filter by ${cat}`}
            >
              <span className="text-sm leading-none opacity-80">{CATEGORY_ICONS[cat]}</span>
              <span>{cat}</span>
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
              aria-label="Sort products"
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
            aria-label="Show in-stock items only"
          >
            <CheckSquare size={12} className={cn(filters.showInStockOnly ? 'text-white' : 'text-[#999999]')} />
            In Stock Only
          </button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              id="clear-filters"
              onClick={clearFilters}
              className="text-xs uppercase tracking-wider text-[#999999] hover:text-[#1A1A1A] transition-colors underline underline-offset-4"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Result Count */}
        <p className="text-xs uppercase tracking-wider text-[#999999]">
          Showing <span className="text-[#1A1A1A] font-semibold">{resultCount}</span> products
        </p>
      </div>
    </div>
  );
}
