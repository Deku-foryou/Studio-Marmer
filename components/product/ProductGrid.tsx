'use client';

import { useFilter } from '../../context/FilterContext';
import { useFilteredProducts } from '../../hooks/useFilteredProducts';
import ProductCard from './ProductCard';
import FilterBar from '../filters/FilterBar';
import { PackageSearch } from 'lucide-react';
import type { CatalogCategory, CatalogProduct } from '../../types/product';

interface ProductGridProps {
  /** Products loaded on the server from MySQL via the data access layer. */
  products: CatalogProduct[];
  /** Categories loaded on the server. */
  categories: CatalogCategory[];
}

/**
 * Client component that owns interactive catalog state (quick-view target and
 * filter-driven sorting). The product rows themselves arrive as serialized
 * props from a Server Component - this component performs no database access
 * and must never import Prisma.
 */
export default function ProductGrid({ products, categories }: ProductGridProps) {
  const { filters } = useFilter();
  const filtered = useFilteredProducts(products, filters);

  return (
    <section aria-label="Product catalog">
      {/* ─── Filters ──────────────────────────────────────── */}
      <div className="mb-8">
        <FilterBar resultCount={filtered.length} categories={categories} />
      </div>

      {/* ─── Grid ─────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="w-20 h-20 border border-[#E5E1DA] bg-white rounded-none flex items-center justify-center">
            <PackageSearch size={32} className="text-[#999999]" />
          </div>
          <div className="text-center">
            <p className="text-lg font-light text-[#1A1A1A] mb-2">
              Produk tidak ditemukan
            </p>
            <p className="text-sm text-[#666666] font-light">
              Coba ubah kata kunci pencarian atau filter yang dipilih.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          role="list"
          aria-label="Products"
        >
          {filtered.map((product, index) => (
            <div
              key={product.id}
              role="listitem"
              className="animate-fade-up h-full flex flex-col"
              style={{
                animationDelay: `${Math.min(index * 50, 400)}ms`,
                animationFillMode: 'both',
              }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
