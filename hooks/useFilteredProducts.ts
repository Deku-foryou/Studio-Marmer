import { useMemo } from 'react';
import type { Product, FilterState } from '@/types/product';

export function useFilteredProducts(
  products: readonly Product[],
  filters: FilterState
): Product[] {
  return useMemo(() => {
    let result = [...products];

    // 1. Text search across title, brand, and tags
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q)
      );
    }

    // 2. Category filter (multi-select — OR logic)
    if (filters.selectedCategories.length > 0) {
      result = result.filter((p) =>
        filters.selectedCategories.includes(p.category)
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
