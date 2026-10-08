import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CatalogCategory } from '@/types/product';

/**
 * Category overview strip — Server Component.
 *
 * Categories are database-driven; nothing is hardcoded here, so a new
 * category created by the client appears automatically.
 *
 * Only categories that currently have at least one available product are
 * listed, and the grid adapts its column count to however many remain.
 */

interface CategoriesSectionProps {
  categories: CatalogCategory[];
  /** Total number of available products, shown as context per category. */
  counts: Record<string, number>;
}

export default function CategoriesSection({
  categories,
  counts,
}: CategoriesSectionProps) {
  // Categories with nothing in them are left out of the strip. They still exist
  // in the database and still render in the catalog FilterBar - this only hides
  // the "0 produk" tiles, which read as broken rather than as "coming soon".
  const populated = categories.filter(
    (category) => (counts[category.slug] ?? 0) > 0
  );

  if (populated.length === 0) return null;

  return (
    <section
      aria-labelledby="kategori-heading"
      className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-16 sm:py-20"
    >
      <div className="flex items-end justify-between gap-6 mb-8 sm:mb-10">
        <div>
          <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-2">
            Kategori
          </span>
          <h2
            id="kategori-heading"
            className="text-2xl sm:text-3xl font-light text-[#1A1A1A] tracking-tight"
          >
            Pilih Kategori
          </h2>
        </div>
      </div>

      {/* Column count follows the number of visible tiles so the strip never
          leaves a row of empty cells behind. */}
      <div
        className={cn(
          'grid grid-cols-2 gap-px bg-[#E5E1DA] border border-[#E5E1DA]',
          populated.length >= 6 && 'sm:grid-cols-3 lg:grid-cols-6',
          populated.length === 5 && 'sm:grid-cols-3 lg:grid-cols-5',
          populated.length === 4 && 'sm:grid-cols-2 lg:grid-cols-4',
          populated.length === 3 && 'sm:grid-cols-3',
          populated.length === 2 && 'grid-cols-2'
        )}
      >
        {populated.map((category) => {
          const count = counts[category.slug] ?? 0;
          return (
            <Link
              key={category.id}
              href="/#katalog"
              className="group bg-[#FBF9F6] px-4 py-7 flex flex-col gap-1.5 hover:bg-white transition-colors duration-500"
            >
              <span className="text-[12px] uppercase tracking-[0.14em] text-[#1A1A1A] font-medium">
                {category.name}
              </span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#999999]">
                {count} produk
              </span>
              <ArrowRight
                size={12}
                strokeWidth={1.5}
                className="text-[#C9C4BC] group-hover:text-[#8B7355] group-hover:translate-x-1 transition-all duration-300 mt-1"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
