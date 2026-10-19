import { NextResponse } from 'next/server';

import { searchProductSuggestions } from '@/lib/data/products';
import { suggestionQuerySchema } from '@/lib/validation/search';

/**
 * GET /api/search/suggestions?q=marmer
 *
 * Feeds the navbar autocomplete. Returns at most five real products for the
 * term; the endpoint path, the limit and the response shape all come from
 * `lib/product-suggestions.ts`, the same module the dropdown imports, so the
 * two sides cannot drift.
 *
 * WHY THIS IS A ROUTE AND NOT A PROP
 * The suggestion list is per-keystroke. Shipping every product to the navbar to
 * filter in the browser would re-download the catalog that the grid deliberately
 * paginates server-side (see `getCatalogProducts`), and would expose products
 * the storefront never lists. This runs the catalog's own `where` predicate and
 * returns only the five rows a dropdown can display.
 */

/** Reads `searchParams` per request; never prerendered or cached by Next. */
export const dynamic = 'force-dynamic';

/**
 * Short shared-cache window so a burst of keystrokes from one visitor hits the
 * database at most once a minute, while a product added in the admin still
 * shows up promptly. Errors opt out of caching entirely.
 */
const SUGGESTION_CACHE_CONTROL =
  'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

const NO_STORE = 'no-store';

function json(body: unknown, status: number, cacheControl: string): Response {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': cacheControl },
  });
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const parsed = suggestionQuerySchema.safeParse({
    q: searchParams.get('q') ?? '',
  });

  if (!parsed.success) {
    return json(
      { suggestions: [], error: 'Permintaan pencarian tidak valid.' },
      400,
      NO_STORE
    );
  }

  try {
    const suggestions = await searchProductSuggestions(parsed.data.q);
    return json({ suggestions }, 200, SUGGESTION_CACHE_CONTROL);
  } catch (error) {
    /*
     * A database hiccup here must not take the navbar down: the dropdown shows a
     * retryable message and the catalog search - which does not depend on this
     * endpoint - keeps working. The error is logged server-side rather than
     * returned, so a connection string or query detail is never echoed to the
     * browser.
     */
    console.error(
      '[api/search/suggestions] gagal memuat saran produk:',
      error
    );
    return json(
      { suggestions: [], error: 'Saran produk tidak dapat dimuat.' },
      500,
      NO_STORE
    );
  }
}