import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CatalogCategory } from '@/types/product';

/**
 * Category overview strip — Server Component.
 *
 * Categories are database-driven; nothing is hardcoded here, so a new
 * category created by the client appears automatically.
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
  if (categories.length === 0) return null;

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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[#E5E1DA] border border-[#E5E1DA]">
        {categories.map((category) => {
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
