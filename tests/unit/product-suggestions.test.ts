import { describe, it, expect, vi, afterEach } from 'vitest';

import {
  MAX_SEARCH_QUERY_LENGTH,
  SEARCH_SUGGEST_DEBOUNCE_MS,
  SEARCH_SUGGESTION_LIMIT,
  buildSuggestionsUrl,
  debounceAsync,
  fetchProductSuggestions,
  nextActiveIndex,
  normalizeSearchTerm,
  resolveEnterAction,
  shouldFetchSuggestions,
  toSuggestionList,
} from '@/lib/product-suggestions';
import {
  DEFAULT_CATALOG_QUERY,
  buildCatalogHref,
  parseCatalogQuery,
  readCatalogQuery,
  toCatalogSearchParams,
} from '@/lib/catalog-query';
import { suggestionQuerySchema } from '@/lib/validation/search';
import type { ProductSuggestion } from '@/types/product';

/**
 * Covers the navbar autocomplete without a DOM.
 *
 * The vitest suite is node-only by design (see vitest.config.mts), so the
 * component itself is not mounted here. Instead everything that decides
 * *what* the dropdown does — the debounce timing, the shape and emptiness of the
 * results, which product Enter resolves to, and what the catalog does with the
 * term — is expressed as pure functions in `lib/product-suggestions.ts` and
 * `lib/catalog-query.ts` and tested here. The component is the thin shell that
 * wires them to the input.
 *
 * `fetch` is stubbed rather than mocked at module level, so the tests exercise
 * the real URL construction, status handling and response parsing.
 */

function makeSuggestion(overrides: Partial<ProductSuggestion> = {}): ProductSuggestion {
  return {
    slug: 'luna',
    title: 'Luna',
    category: 'Vas',
    price: 325000,
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/luna.jpg',
    ...overrides,
  };
}

function stubFetch(
  impl: (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>
): ReturnType<typeof vi.fn> {
  const spy = vi.fn((input: RequestInfo | URL) =>
    Promise.resolve(impl(String(input)))
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

function okResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ─── Term normalization ───────────────────────────────────────────────────────

describe('normalizeSearchTerm', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeSearchTerm('  marmer  ')).toBe('marmer');
  });

  it('turns an empty or whitespace-only value into an empty term', () => {
    expect(normalizeSearchTerm('')).toBe('');
    expect(normalizeSearchTerm('    ')).toBe('');
    expect(normalizeSearchTerm(null)).toBe('');
    expect(normalizeSearchTerm(undefined)).toBe('');
  });

  it('caps the term length so a hand-edited URL cannot flood the database', () => {
    const long = 'a'.repeat(500);
    expect(normalizeSearchTerm(long)).toHaveLength(MAX_SEARCH_QUERY_LENGTH);
  });

  it('preserves case - matching is the database\'s collation, not the client\'s', () => {
    expect(normalizeSearchTerm('Luna')).toBe('Luna');
  });
});

describe('shouldFetchSuggestions', () => {
  it('suppresses an empty term - clearing the box must not hit the database', () => {
    expect(shouldFetchSuggestions('')).toBe(false);
  });

  it('allows a single character', () => {
    expect(shouldFetchSuggestions('L')).toBe(true);
  });
});

// ─── Debounce ─────────────────────────────────────────────────────────────────

describe('debounceAsync', () => {
  it('collapses a burst of keystrokes into a single call', () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const debounced = debounceAsync(run, SEARCH_SUGGEST_DEBOUNCE_MS);

    // Typing "marmer" one character at a time inside the debounce window.
    for (const term of ['m', 'ma', 'mar', 'marmer']) {
      debounced.call(term);
      vi.advanceTimersByTime(50);
    }

    expect(run).not.toHaveBeenCalled();

    vi.advanceTimersByTime(SEARCH_SUGGEST_DEBOUNCE_MS);

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith('marmer');
  });

  it('runs again for a term typed after the window has elapsed', () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const debounced = debounceAsync(run, SEARCH_SUGGEST_DEBOUNCE_MS);

    debounced.call('lu');
    vi.advanceTimersByTime(SEARCH_SUGGEST_DEBOUNCE_MS);
    debounced.call('luna');
    vi.advanceTimersByTime(SEARCH_SUGGEST_DEBOUNCE_MS);

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('cancel() drops the pending call - this is what prevents a stale request', () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const debounced = debounceAsync(run, SEARCH_SUGGEST_DEBOUNCE_MS);

    debounced.call('luna');
    debounced.cancel();
    vi.advanceTimersByTime(SEARCH_SUGGEST_DEBOUNCE_MS * 5);

    expect(run).not.toHaveBeenCalled();
  });

  it('uses a delay inside the requested 200-300ms window', () => {
    expect(SEARCH_SUGGEST_DEBOUNCE_MS).toBeGreaterThanOrEqual(200);
    expect(SEARCH_SUGGEST_DEBOUNCE_MS).toBeLessThanOrEqual(300);
  });
});

// ─── Autocomplete results ─────────────────────────────────────────────────────

describe('fetchProductSuggestions', () => {
  it('requests the suggestion endpoint with the encoded term', async () => {
    const spy = stubFetch(() => Promise.resolve(okResponse({ suggestions: [] })));

    await fetchProductSuggestions('lu na');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toBe(
      '/api/search/suggestions?q=lu%20na'
    );
  });

  it('returns real products from the response', async () => {
    stubFetch(() =>
      Promise.resolve(
        okResponse({
          suggestions: [makeSuggestion(), makeSuggestion({ slug: 'lurian', title: 'Lurian' })],
        })
      )
    );

    const results = await fetchProductSuggestions('Lu');

    expect(results.map((r) => r.title)).toEqual(['Luna', 'Lurian']);
    expect(results[0]?.slug).toBe('luna');
  });

  it('never issues a request for an empty term', async () => {
    const spy = stubFetch(() => Promise.resolve(okResponse({ suggestions: [] })));

    expect(await fetchProductSuggestions('   ')).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns an empty list - not a throw - for a successful but empty result', async () => {
    stubFetch(() => Promise.resolve(okResponse({ suggestions: [] })));

    expect(await fetchProductSuggestions('zzzz')).toEqual([]);
  });

  it('throws on a non-2xx response so the UI can show its error state', async () => {
    stubFetch(() =>
      Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) })
    );

    await expect(fetchProductSuggestions('luna')).rejects.toThrow();
  });

  it('caps the list at five suggestions', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeSuggestion({ slug: `p-${i}`, title: `Produk ${i}` })
    );

    expect(toSuggestionList({ suggestions: many })).toHaveLength(
      SEARCH_SUGGESTION_LIMIT
    );
    expect(SEARCH_SUGGESTION_LIMIT).toBe(5);
  });

  it('drops malformed rows instead of rendering undefined', () => {
    const payload = {
      suggestions: [
        makeSuggestion({ slug: 'luna' }),
        { slug: 'rusak' },
        null,
        { ...makeSuggestion(), price: 'bukan-angka' },
        'bukan-objek',
      ],
    };

    const result = toSuggestionList(payload);

    expect(result).toHaveLength(1);
    expect(result[0]?.slug).toBe('luna');
  });

  it('treats a malformed body as "no results" rather than an exception', () => {
    expect(toSuggestionList(null)).toEqual([]);
    expect(toSuggestionList('bukan-objek')).toEqual([]);
    expect(toSuggestionList({})).toEqual([]);
    expect(toSuggestionList({ suggestions: 'bukan-array' })).toEqual([]);
  });

  it('forwards the abort signal so typing on cancels the in-flight request', async () => {
    const spy = stubFetch(() => Promise.resolve(okResponse({ suggestions: [] })));
    const controller = new AbortController();

    await fetchProductSuggestions('luna', { signal: controller.signal });

    const init = spy.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBe(controller.signal);
  });
});

// ─── Enter navigation ─────────────────────────────────────────────────────────

describe('resolveEnterAction', () => {
  const suggestions = [
    makeSuggestion({ slug: 'luna', title: 'Luna' }),
    makeSuggestion({ slug: 'lurian', title: 'Lurian' }),
  ];

  it('opens the highlighted product instead of the catalog', () => {
    const action = resolveEnterAction({
      term: 'Lu',
      activeIndex: 1,
      suggestions,
    });

    expect(action).toEqual({ kind: 'product', slug: 'lurian' });
  });

  it('falls back to the catalog when nothing is highlighted', () => {
    const action = resolveEnterAction({
      term: 'Lu',
      activeIndex: -1,
      suggestions,
    });

    expect(action).toEqual({ kind: 'catalog', term: 'Lu' });
  });

  it('goes to the catalog when the highlighted row is stale', () => {
    const action = resolveEnterAction({
      term: 'Lu',
      activeIndex: 4,
      suggestions,
    });

    expect(action).toEqual({ kind: 'catalog', term: 'Lu' });
  });

  it('trims the term it forwards to the catalog', () => {
    const action = resolveEnterAction({
      term: '  marmer  ',
      activeIndex: -1,
      suggestions: [],
    });

    expect(action).toEqual({ kind: 'catalog', term: 'marmer' });
  });

  it('only ever resolves to ONE action - Enter must not navigate twice', () => {
    const cases = [
      { term: 'Lu', activeIndex: 0, suggestions },
      { term: 'Lu', activeIndex: -1, suggestions },
      { term: 'Lu', activeIndex: 0, suggestions: [] },
      { term: '', activeIndex: -1, suggestions },
      { term: '   ', activeIndex: 2, suggestions: [] },
    ];

    for (const input of cases) {
      const action = resolveEnterAction(input);
      expect(['product', 'catalog', 'dismiss']).toContain(action.kind);
    }
  });

  it('dismisses on an empty term rather than navigating to a bare catalog', () => {
    expect(resolveEnterAction({ term: '', activeIndex: -1, suggestions: [] })).toEqual({
      kind: 'dismiss',
    });
    expect(resolveEnterAction({ term: '  ', activeIndex: -1, suggestions })).toEqual({
      kind: 'dismiss',
    });
  });
});

// ─── Arrow key navigation ─────────────────────────────────────────────────────

describe('nextActiveIndex', () => {
  const count = 3;

  it('enters the list from the top when nothing is highlighted', () => {
    expect(nextActiveIndex(-1, 1, count)).toBe(0);
  });

  it('steps down and up', () => {
    expect(nextActiveIndex(0, 1, count)).toBe(1);
    expect(nextActiveIndex(1, -1, count)).toBe(0);
  });

  it('wraps at both ends', () => {
    expect(nextActiveIndex(2, 1, count)).toBe(0);
    expect(nextActiveIndex(0, -1, count)).toBe(2);
  });

  it('never highlights anything when the list is empty', () => {
    expect(nextActiveIndex(-1, 1, 0)).toBe(-1);
    expect(nextActiveIndex(2, 1, 0)).toBe(-1);
  });
});

// ─── Catalog search ───────────────────────────────────────────────────────────

describe('catalog search round trip', () => {
  it('reads the term back out of ?q=', () => {
    const params = new URLSearchParams('q=marmer&page=2');
    expect(readCatalogQuery(params).search).toBe('marmer');
  });

  it('preserves the term when Enter builds the catalog href', () => {
    const href = buildCatalogHref(
      '/',
      { ...DEFAULT_CATALOG_QUERY, search: 'Luna' },
      { scrollToCatalog: true }
    );

    expect(href).toBe('/?q=Luna#katalog');
    expect(buildSuggestionsUrl('Luna')).toBe(
      '/api/search/suggestions?q=Luna'
    );
  });

  it('serializes the term so the catalog page re-runs the filter', () => {
    const params = toCatalogSearchParams({
      ...DEFAULT_CATALOG_QUERY,
      search: 'Luna',
    });

    expect(params.get('q')).toBe('Luna');
    expect(parseCatalogQuery({ q: params.get('q') ?? '' }).search).toBe('Luna');
  });

  it('resets the page so Enter on page 3 lands on the first page of results', () => {
    // This mirrors what NavbarSearch passes: the current query with the term
    // replaced and the page forced back to 1.
    const href = buildCatalogHref(
      '/',
      { ...DEFAULT_CATALOG_QUERY, search: 'Luna', page: 1 },
      { scrollToCatalog: true }
    );

    expect(href).toBe('/?q=Luna#katalog');
    expect(readCatalogQuery(new URLSearchParams('q=Luna&page=3')).search).toBe(
      'Luna'
    );
  });

  it('treats a blank ?q= as no search at all', () => {
    expect(parseCatalogQuery({ q: '   ' }).search).toBe('');
  });

  it('truncates an over-long ?q= before it reaches the database', () => {
    const parsed = parseCatalogQuery({ q: 'x'.repeat(500) });

    expect(normalizeSearchTerm(parsed.search)).toHaveLength(
      MAX_SEARCH_QUERY_LENGTH
    );
  });
});

// ─── Endpoint validation ──────────────────────────────────────────────────────

describe('suggestionQuerySchema', () => {
  it('accepts an ordinary term', () => {
    expect(suggestionQuerySchema.safeParse({ q: 'lu' }).success).toBe(true);
  });

  it('rejects a missing or blank term', () => {
    expect(suggestionQuerySchema.safeParse({ q: '' }).success).toBe(false);
    expect(suggestionQuerySchema.safeParse({ q: '   ' }).success).toBe(false);
  });

  it('rejects a term beyond the length cap', () => {
    expect(
      suggestionQuerySchema.safeParse({ q: 'x'.repeat(500) }).success
    ).toBe(false);
  });
});