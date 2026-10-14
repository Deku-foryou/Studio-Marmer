/**
 * Server-only data access layer for site-wide settings.
 *
 * Same architecture as lib/data/products.ts:
 *   UI (Server Component)  ->  these functions  ->  Prisma  ->  MySQL
 *
 * Client Components must never import this module. See the note in
 * lib/data/products.ts for why that boundary is enforced without the
 * `server-only` package.
 */

if (typeof window !== 'undefined') {
  throw new Error(
    'lib/data/site.ts is server-only and must not be imported by a Client Component.'
  );
}

import { cache } from 'react';

import { prisma } from '@/lib/db/prisma';
import type { SiteSettingsDTO } from '@/types/site';

/** The table is a singleton pinned to id = 1. */
const SETTINGS_ID = 1;

const FALLBACK: SiteSettingsDTO = {
  siteName: 'Studio Marmer',
  logoUrl: null,
  whatsappNumber: null,
  shopeeUrl: null,
  instagramUrl: null,
  tiktokUrl: null,
  email: null,
  address: null,
  heroTitle: null,
  heroSubtitle: null,
  heroImageUrl: null,
};

/**
 * Returns the singleton settings row.
 * Falls back to sane defaults so a missing or unconfigured row can never
 * crash a page render.
 *
 * Memoized per request with React's `cache()`.
 *
 * This table is a singleton pinned to `id = 1`, so there is nothing
 * parameterised about the read and nothing that could differ between two calls
 * in the same render. Yet every storefront route asks for it twice: once from
 * `app/(store)/layout.tsx` for the Navbar and Footer, and once from the page
 * itself for the hero and CTA. That is two identical SELECTs per request for one
 * row, and `cache()` collapses them into one.
 *
 * What this does and does not change:
 *   - The scope is the React request. Every caller is a Server Component (see
 *     the call sites), the layout and the page render in the same pass, so they
 *     share one cache entry. A client-side navigation is a new request and
 *     therefore a fresh read, so settings edits are still picked up at once.
 *   - The function body is untouched: same query, same `select`, same FALLBACK
 *     for a missing or unconfigured row.
 *   - `cache()` returns a value, never a promise, so there is no shared
 *     in-flight rejection to worry about.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettingsDTO> => {
  const row = await prisma.siteSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: {
      siteName: true,
      logoUrl: true,
      whatsappNumber: true,
      shopeeUrl: true,
      instagramUrl: true,
      tiktokUrl: true,
      email: true,
      address: true,
      heroTitle: true,
      heroSubtitle: true,
      heroImageUrl: true,
    },
  });

  if (!row) return { ...FALLBACK };

  return {
    siteName: row.siteName || FALLBACK.siteName,
    logoUrl: row.logoUrl,
    whatsappNumber: row.whatsappNumber,
    shopeeUrl: row.shopeeUrl,
    instagramUrl: row.instagramUrl,
    tiktokUrl: row.tiktokUrl,
    email: row.email,
    address: row.address,
    heroTitle: row.heroTitle,
    heroSubtitle: row.heroSubtitle,
    heroImageUrl: row.heroImageUrl,
  };
});
