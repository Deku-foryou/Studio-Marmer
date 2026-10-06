'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { FilterState, SortOption } from '@/types/product';

// ─── Initial State ─────────────────────────────────────────────────────────────
const initialFilterState: FilterState = {
  searchQuery: '',
  selectedCategories: [],
  selectedSort: 'featured',
  showInStockOnly: false,
};

// ─── Context Shape ─────────────────────────────────────────────────────────────
interface FilterContextValue {
  filters: FilterState;
  setSearchQuery: (q: string) => void;
  toggleCategory: (cat: string) => void;
  setSort: (sort: SortOption) => void;
  toggleInStock: () => void;
  clearFilters: () => void;
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

// ─── Provider ──────────────────────────────────────────────────────────────────
interface FilterProviderProps {
  children: ReactNode;
}

export function FilterProvider({ children }: FilterProviderProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilterState);

  const setSearchQuery = useCallback((q: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: q }));
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setFilters((prev) => {
      const already = prev.selectedCategories.includes(cat);
      return {
        ...prev,
        selectedCategories: already
          ? prev.selectedCategories.filter((c) => c !== cat)
          : [...prev.selectedCategories, cat],
      };
    });
  }, []);

  const setSort = useCallback((sort: SortOption) => {
    setFilters((prev) => ({ ...prev, selectedSort: sort }));
  }, []);

  const toggleInStock = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      showInStockOnly: !prev.showInStockOnly,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilterState);
  }, []);

  const value = useMemo<FilterContextValue>(
    () => ({
      filters,
      setSearchQuery,
      toggleCategory,
      setSort,
      toggleInStock,
      clearFilters,
    }),
    [filters, setSearchQuery, toggleCategory, setSort, toggleInStock, clearFilters]
  );

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useFilter(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return ctx;
}
