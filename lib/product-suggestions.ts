/**
 * Product autocomplete contract — isomorphic, dependency-free.
 *
 * Imported by BOTH sides of the autocomplete:
 *   - the client dropdown (`components/layout/NavbarSearch.tsx`)
 *   - the server data layer + route handler (`lib/data/products.ts`,
 *     `app/api/search/suggestions/route.ts`)
 *
 * Like `lib/catalog-query.ts`, this module must never import Prisma: it is
 * bundled into the browser, and it also carries the request path and the response
 * shape, so the two sides cannot drift apart.
 *
 * WHERE THE SUGGESTIONS COME FROM
 * Suggestions are real rows from `products`, never a hardcoded or sample list.
 * The server runs the *same* `buildCatalogWhere` predicate the catalog grid
 * uses, so a suggestion can never advertise a product that the catalog page
 * would then refuse to show, and vice versa.
 */

import type { ProductSuggestion } from '@/types/product';

/** Maximum suggestions in the dropdown. */
export const SEARCH_SUGGESTION_LIMIT = 5;

/**
 * Upper bound on a search term, applied on both sides of the wire.
 *
 * The term is interpolated into a SQL `LIKE` pattern by Prisma, so an unbounded
 * string from the URL bar would let a visitor hand the database an arbitrarily
 * large pattern to scan. Truncating at a length no real product name approaches
 * (the longest catalog title is far shorter) costs nothing and bounds the work.
 */
export const MAX_SEARCH_QUERY_LENGTH = 60;

/**
 * Typing debounce for the suggestion request.
 *
 * 250ms sits in the middle of the requested 200-300ms window: short enough that
 * results feel attached to the keystroke, long enough that typing "marmer" is
 * one request rather than six.
 */
export const SEARCH_SUGGEST_DEBOUNCE_MS = 250;

/**
 * Shortest term that triggers a request.
 *
 * A single character is enough: MySQL's `contains` already narrows it to
 * products starting with that letter, which is a useful "browse by letter"
 * behaviour rather than noise. Zero characters is the only case that is
 * suppressed - an empty box must not hit the database, and must not show the
 * whole catalog as a suggestion list.
 */
export const MIN_SEARCH_SUGGESTION_LENGTH = 1;

/** Path of the suggestion endpoint, in one place so client and route agree. */
export const SEARCH_SUGGESTIONS_ENDPOINT = '/api/search/suggestions';

/** Trims and caps a raw search term. Empty / whitespace-only becomes ''. */
export function normalizeSearchTerm(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
}

/** Whether a term is long enough to be worth a request. */
export function shouldFetchSuggestions(term: string): boolean {
  return term.length >= MIN_SEARCH_SUGGESTION_LENGTH;
}

/** Builds the request URL for a term. */
export function buildSuggestionsUrl(term: string): string {
  return `${SEARCH_SUGGESTIONS_ENDPOINT}?q=${encodeURIComponent(term)}`;
}

// ─── Response parsing ─────────────────────────────────────────────────────────

/**
 * Runtime shape check for one suggestion.
 *
 * The response crosses the network, so it is treated as untrusted rather than
 * cast: a malformed row is dropped instead of rendering `undefined` into the
 * dropdown or throwing while React is rendering.
 */
function isSuggestion(value: unknown): value is ProductSuggestion {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.slug === 'string' &&
    row.slug.length > 0 &&
    typeof row.title === 'string' &&
    row.title.length > 0 &&
    typeof row.price === 'number' &&
    Number.isFinite(row.price) &&
    typeof row.category === 'string' &&
    typeof row.imageUrl === 'string'
  );
}

/**
 * Extracts suggestions from a parsed response body.
 *
 * Exported separately from the fetch so the parsing rules can be tested without
 * a network, and so a successful-but-malformed body degrades to "no results"
 * rather than an exception.
 */
export function toSuggestionList(payload: unknown): ProductSuggestion[] {
  if (!payload || typeof payload !== 'object') return [];
  const raw = (payload as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(raw)) return [];

  return raw.filter(isSuggestion).slice(0, SEARCH_SUGGESTION_LIMIT);
}

/** Fetches suggestions for a term. Throws on a non-2xx response. */
export async function fetchProductSuggestions(
  term: string,
  init?: { signal?: AbortSignal }
): Promise<ProductSuggestion[]> {
  const normalized = normalizeSearchTerm(term);
  if (!shouldFetchSuggestions(normalized)) return [];

  const response = await fetch(buildSuggestionsUrl(normalized), {
    signal: init?.signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Permintaan saran produk gagal (HTTP ${response.status}).`);
  }

  return toSuggestionList(await response.json());
}

// ─── Keyboard behaviour ───────────────────────────────────────────────────────

/**
 * What Enter should do, given the current input and highlight.
 *
 * Isolated here because "Enter must not navigate twice" is a correctness rule,
 * not a styling detail: the dropdown is open *and* the catalog is being
 * re-filtered by the typing debounce, so the naive handler would push the
 * catalog while the highlighted row pointed somewhere else.
 *
 * Precedence is deliberate:
 *   1. a highlighted suggestion  -> that product (keyboard selection)
 *   2. otherwise, a usable term  -> the catalog grid (full result set)
 *   3. otherwise                 -> dismiss (nothing to search for)
 */
export type EnterAction =
  | { readonly kind: 'product'; readonly slug: string }
  | { readonly kind: 'catalog'; readonly term: string }
  | { readonly kind: 'dismiss' };

export function resolveEnterAction(input: {
  term: string;
  activeIndex: number;
  suggestions: readonly ProductSuggestion[];
}): EnterAction {
  const active =
    input.activeIndex >= 0 ? input.suggestions[input.activeIndex] : undefined;

  if (active) return { kind: 'product', slug: active.slug };

  const term = normalizeSearchTerm(input.term);
  if (!shouldFetchSuggestions(term)) return { kind: 'dismiss' };

  return { kind: 'catalog', term };
}

/**
 * Moves the highlight, wrapping at both ends.
 *
 * ArrowDown from the last row returns to the first and ArrowUp from the first
 * returns to the last, which is what a listbox is expected to do; with nothing
 * highlighted (index -1) ArrowDown enters at the top. An empty list always
 * resolves to -1, so a stale highlight can never point at a missing row.
 */
export function nextActiveIndex(
  current: number,
  delta: number,
  count: number
): number {
  if (count <= 0) return -1;

  const next = current + delta;
  if (next < 0) return count - 1;
  if (next >= count) return 0;
  return next;
}

// ─── Debounce ──────────────────────────────────────────────────────────────────

/** A cancellable, trailing-edge debouncer. */
export interface Debounced<Args extends unknown[]> {
  call: (...args: Args) => void;
  cancel: () => void;
}

/**
 * Trailing-edge debounce.
 *
 * Exists as a named helper, rather than a bare `setTimeout` inside the effect,
 * because the component re-arms the timer on every keystroke and that re-arming
 * is exactly what needs testing: the point is that N fast keystrokes collapse
 * into ONE request. Behaviour (not just the delay constant) is covered by the
 * unit suite.
 */
export function debounceAsync<Args extends unknown[]>(
  fn: (...args: Args) => Promise<void> | void,
  delayMs: number
): Debounced<Args> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancel = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return {
    call(...args: Args) {
      cancel();
      timer = setTimeout(() => {
        timer = undefined;
        void fn(...args);
      }, delayMs);
    },
    cancel,
  };
}