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
};

/**
 * Returns the singleton settings row.
 * Falls back to sane defaults so a missing or unconfigured row can never
 * crash a page render.
 */
export async function getSiteSettings(): Promise<SiteSettingsDTO> {
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
  };
}
