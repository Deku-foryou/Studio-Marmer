/**
 * Catalog query-string contract.
 *
 * The catalog is fully described by the URL: filter, sort, search and page all
 * live in `searchParams`, and the server re-runs the database query for whatever
 * the URL says. That keeps a result set shareable, back/forward friendly and
 * bookmarkable, and it is what allows the data access layer to paginate with
 * `skip`/`take` instead of shipping every product to the browser.
 *
 * This module is deliberately dependency-free and isomorphic: it is imported by
 * the Server Component (which parses `searchParams`) *and* by Client Components
 * (which build hrefs from `useSearchParams`). It must never import Prisma.
 */

import type { SortOption } from '@/types/product';

/** Rows per catalog page. Identical on mobile, tablet and desktop - only the
 *  grid column count is responsive, never the number of items. */
export const PRODUCTS_PER_PAGE = 8;

/** Anchor id of the catalog section, used to scroll back to the grid. */
export const CATALOG_ANCHOR = 'katalog';

/**
 * Query parameter names. `kategori` and `sort` match the vocabulary already used
 * elsewhere in the storefront copy; the rest are named explicitly so the URL
 * never has to guess which of several params it is looking at.
 */
export const PARAM_PAGE = 'page';
export const PARAM_CATEGORIES = 'kategori';
export const PARAM_IN_STOCK = 'tersedia';
export const PARAM_SORT = 'sort';
export const PARAM_SEARCH = 'q';

/** The sort orders the data access layer knows how to translate. */
const SORT_VALUES: readonly string[] = [
  'featured',
  'price-asc',
  'price-desc',
  'trending',
];

export function isSortOption(value: string): value is SortOption {
  return SORT_VALUES.includes(value);
}

/** Fully resolved catalog request: what the URL asked for, already sanitized. */
export interface CatalogQuery {
  /** 1-based. Clamped against the real result count by the data access layer. */
  readonly page: number;
  readonly search: string;
  /** Active category slugs, OR'ed together. */
  readonly categories: readonly string[];
  readonly inStockOnly: boolean;
  readonly sort: SortOption;
}

/** Unfiltered, first page - also what "Hapus Filter" resets the URL to. */
export const DEFAULT_CATALOG_QUERY: CatalogQuery = {
  page: 1,
  search: '',
  categories: [],
  inStockOnly: false,
  sort: 'featured',
};

// ─── Parsing ───────────────────────────────────────────────────────────────────

/** Reads every value for one key, so repeated params (?kategori=a&kategori=b) work. */
type ParamReader = (key: string) => readonly string[];

/**
 * Single source of truth for parsing, shared by the server and the browser.
 *
 * Every value is validated defensively: a hand-edited URL (?page=abc,
 * ?sort=<script>) can never produce an invalid page number, an unknown sort key,
 * or an unescaped query that reaches the database.
 */
function parseFrom(get: ParamReader): CatalogQuery {
  const rawPage = get(PARAM_PAGE)[0];
  const parsedPage = rawPage ? Number.parseInt(rawPage, 10) : Number.NaN;
  const rawSort = get(PARAM_SORT)[0];

  return {
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    search: (get(PARAM_SEARCH)[0] ?? '').trim(),
    categories: get(PARAM_CATEGORIES)
      .map((slug) => slug.trim())
      .filter((slug) => slug.length > 0),
    inStockOnly: get(PARAM_IN_STOCK)[0] === 'true',
    sort: rawSort && isSortOption(rawSort) ? rawSort : 'featured',
  };
}

/** Parses the `searchParams` prop of a Server Component page. */
export function parseCatalogQuery(
  params: Record<string, string | string[] | undefined>
): CatalogQuery {
  return parseFrom((key) => {
    const value = params[key];
    if (value === undefined) return [];
    return Array.isArray(value) ? value : [value];
  });
}

/** Parses `useSearchParams()` inside a Client Component. */
export function readCatalogQuery(params: URLSearchParams): CatalogQuery {
  return parseFrom((key) => params.getAll(key));
}

// ─── Serialization ─────────────────────────────────────────────────────────────

/**
 * Serializes a query back to search params.
 *
 * Values equal to the default are omitted, so the default catalog is a clean `/`
 * and a second page is a tidy `/?page=2` rather than a wall of noise.
 */
export function toCatalogSearchParams(query: CatalogQuery): URLSearchParams {
  const params = new URLSearchParams();

  for (const slug of query.categories) {
    params.append(PARAM_CATEGORIES, slug);
  }
  if (query.inStockOnly) {
    params.set(PARAM_IN_STOCK, 'true');
  }
  if (query.sort !== DEFAULT_CATALOG_QUERY.sort) {
    params.set(PARAM_SORT, query.sort);
  }
  if (query.search) {
    params.set(PARAM_SEARCH, query.search);
  }
  if (query.page > 1) {
    params.set(PARAM_PAGE, String(query.page));
  }

  return params;
}

/**
 * Builds a link for one page of a query, preserving every active filter.
 * `scrollToCatalog` appends the existing section anchor so a page change lands
 * the visitor back at the grid instead of wherever they happened to be scrolled.
 */
export function buildCatalogHref(
  pathname: string,
  query: CatalogQuery,
  options: { scrollToCatalog?: boolean } = {}
): string {
  const qs = toCatalogSearchParams(query).toString();
  const base = qs ? `${pathname}?${qs}` : pathname;
  return options.scrollToCatalog ? `${base}#${CATALOG_ANCHOR}` : base;
}