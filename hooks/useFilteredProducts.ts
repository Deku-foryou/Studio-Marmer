import { useMemo } from 'react';
import type { CatalogProduct, FilterState } from '@/types/product';

/**
 * Client-side filter/search pipeline over the serialized catalog.
 *
 * The rows arrive as props from a Server Component, so this stays a pure,
 * memoized transform. Server-side search is deliberately out of scope for this
 * phase.
 */
export function useFilteredProducts(
  products: readonly CatalogProduct[],
  filters: FilterState
): CatalogProduct[] {
  return useMemo(() => {
    let result = [...products];

    // 1. Text search across title, brand (stone type) and category
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    // 2. Category filter (multi-select — OR logic, matched by category slug)
    if (filters.selectedCategories.length > 0) {
      result = result.filter((p) =>
        filters.selectedCategories.includes(p.categorySlug)
      );
    }

    // 3. In-stock filter
    if (filters.showInStockOnly) {
      result = result.filter((p) => p.stockStatus !== 'Out of Stock');
    }

    // 4. Sort
    switch (filters.selectedSort) {
      case 'price-asc':
        return [...result].sort((a, b) => a.price - b.price);
      case 'price-desc':
        return [...result].sort((a, b) => b.price - a.price);
      case 'trending':
        return [...result].sort(
          (a, b) => (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0)
        );
      case 'featured':
      default:
        return result;
    }
  }, [
    products,
    filters.searchQuery,
    filters.selectedCategories,
    filters.showInStockOnly,
    filters.selectedSort,
  ]);
}
