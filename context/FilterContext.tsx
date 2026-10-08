'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  DEFAULT_CATALOG_QUERY,
  readCatalogQuery,
  toCatalogSearchParams,
  type CatalogQuery,
} from '@/lib/catalog-query';
import type { FilterState, SortOption } from '@/types/product';

/**
 * Catalog filter state, with the URL as the single source of truth.
 *
 * The previous implementation kept filters in component state and filtered an
 * already-downloaded catalog in the browser. That cannot paginate: slicing 8 rows
 * out of a client-side result set would make `?page=2` mean different products
 * depending on which filters happened to be active. So the state now lives in
 * `searchParams`, the server does the filtering, and every setter is a
 * navigation.
 *
 * Consumers (FilterBar, NavbarSearch, Pagination) are unchanged in shape - they
 * still call `toggleCategory` / `setSort` / etc.
 */

// ─── Context shape ─────────────────────────────────────────────────────────────

interface FilterContextValue {
  /** The active filters, in the shape the UI already expects. */
  filters: FilterState;
  /** The same state as a full catalog request, including the current page. */
  query: CatalogQuery;
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // `readCatalogQuery` builds a fresh object on every call, which would give
  // `query` a new identity each render and re-arm the navbar's search debounce
  // forever. Keying the memo on the serialized params keeps both `query` and
  // every callback below referentially stable while the URL is unchanged.
  const paramsKey = searchParams.toString();
  const query = useMemo(
    () => readCatalogQuery(new URLSearchParams(paramsKey)),
    [paramsKey]
  );

  /**
   * Writes a new catalog request to the URL.
   *
   * Every filter change resets `page` to 1: page 3 of the old result set is not a
   * meaningful position in the new one, and keeping it is the classic way to
   * land a visitor on an empty grid.
   *
   * `scroll: false` because the filter bar sits directly above the grid, so
   * jumping the viewport would be more disruptive than staying put.
   */
  const navigate = useCallback(
    (next: CatalogQuery, options: { replace?: boolean } = {}) => {
      const qs = toCatalogSearchParams({ ...next, page: 1 }).toString();
      const href = qs ? `${pathname}?${qs}` : pathname;

      if (options.replace) {
        router.replace(href, { scroll: false });
      } else {
        router.push(href, { scroll: false });
      }
    },
    [pathname, router]
  );

  const setSearchQuery = useCallback(
    (search: string) => {
      // Replaced, not pushed: a debounced search should not bury the previous
      // page under a history entry for every keystroke.
      navigate({ ...query, search }, { replace: true });
    },
    [navigate, query]
  );

  const toggleCategory = useCallback(
    (cat: string) => {
      const already = query.categories.includes(cat);
      const categories = already
        ? query.categories.filter((slug) => slug !== cat)
        : [...query.categories, cat];
      navigate({ ...query, categories });
    },
    [navigate, query]
  );

  const setSort = useCallback(
    (sort: SortOption) => navigate({ ...query, sort }),
    [navigate, query]
  );

  const toggleInStock = useCallback(
    () => navigate({ ...query, inStockOnly: !query.inStockOnly }),
    [navigate, query]
  );

  const clearFilters = useCallback(
    () => navigate(DEFAULT_CATALOG_QUERY),
    [navigate]
  );

  const filters = useMemo<FilterState>(
    () => ({
      searchQuery: query.search,
      selectedCategories: query.categories,
      selectedSort: query.sort,
      showInStockOnly: query.inStockOnly,
    }),
    [query.search, query.categories, query.sort, query.inStockOnly]
  );

  const value = useMemo<FilterContextValue>(
    () => ({
      filters,
      query,
      setSearchQuery,
      toggleCategory,
      setSort,
      toggleInStock,
      clearFilters,
    }),
    [
      filters,
      query,
      setSearchQuery,
      toggleCategory,
      setSort,
      toggleInStock,
      clearFilters,
    ]
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