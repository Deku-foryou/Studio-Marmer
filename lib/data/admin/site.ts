/**
 * Admin data access layer for site-wide settings — Server Component /
 * server-action only.
 *
 * The `site_settings` table is a SINGLETON pinned to `id = 1`. There is never a
 * second row and never an auto-increment id: reads always target `SETTINGS_ID`,
 * and writes go through `upsert` so a missing row is restored in place instead
 * of duplicating the configuration.
 *
 * Every value returned here is a plain JSON-safe primitive, so the result can
 * be handed to a Client Component without further conversion.
 *
 * Server-only enforcement matches lib/data/admin/products.ts: importing
 * `@/lib/db/prisma` pulls in `@prisma/client`, which cannot be bundled for the
 * browser. The guard below is the explicit belt-and-braces check.
 */

if (typeof window !== 'undefined') {
  throw new Error(
    'lib/data/admin/site.ts is server-only and must not be imported by a Client Component.'
  );
}

import { prisma } from '@/lib/db/prisma';
import type { SiteSettingsInput } from '@/lib/validation/site-settings';

/** The only primary key the singleton may ever have. */
export const SITE_SETTINGS_ID = 1;

/** Every `site_settings` column except `siteName`, which is required. */
type OptionalSettingField =
  | 'logoUrl'
  | 'whatsappNumber'
  | 'shopeeUrl'
  | 'instagramUrl'
  | 'tiktokUrl'
  | 'email'
  | 'address'
  | 'heroTitle'
  | 'heroSubtitle';

/**
 * Admin-facing settings shape: the editable fields plus row metadata.
 *
 * Mirrors `SiteSettingsInput` but with `null` for the optional fields, the way
 * the database stores them, so the value read back from Prisma can be handed
 * straight to the form without a null-to-undefined conversion.
 *
 * `id` and `updatedAt` are never written by the admin.
 */
export interface AdminSiteSettings extends Omit<SiteSettingsInput, OptionalSettingField> {
  logoUrl: string | null;
  whatsappNumber: string | null;
  shopeeUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  email: string | null;
  address: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  id: number;
  updatedAt: string;
}

const SETTINGS_SELECT = {
  id: true,
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
  updatedAt: true,
} as const;

/**
 * Returns the singleton settings row for the admin form.
 *
 * If the row is unexpectedly missing (a wiped dev database, a manual delete),
 * the defaults are returned together with `exists: false` so the page can say
 * so and the next save will recreate the row at id = 1.
 */
export async function getAdminSiteSettings(): Promise<{
  settings: AdminSiteSettings | null;
  exists: boolean;
}> {
  const row = await prisma.siteSettings.findUnique({
    where: { id: SITE_SETTINGS_ID },
    select: SETTINGS_SELECT,
  });

  if (!row) return { settings: null, exists: false };

  return {
    settings: { ...row, updatedAt: row.updatedAt.toISOString() },
    exists: true,
  };
}

/**
 * Writes the singleton row at `id = 1`.
 *
 * Uses `upsert` keyed on `SITE_SETTINGS_ID` rather than `create`, so a save can
 * never allocate a new id or leave a second settings row behind: if the row was
 * deleted it is restored at the same primary key.
 *
 * The input has already been validated and normalised by the server action —
 * this layer performs no second opinion on the values.
 */
export async function updateAdminSiteSettings(
  input: SiteSettingsInput
): Promise<AdminSiteSettings> {
  const row = await prisma.siteSettings.upsert({
    where: { id: SITE_SETTINGS_ID },
    create: {
      id: SITE_SETTINGS_ID,
      siteName: input.siteName,
      logoUrl: input.logoUrl ?? null,
      whatsappNumber: input.whatsappNumber ?? null,
      shopeeUrl: input.shopeeUrl ?? null,
      instagramUrl: input.instagramUrl ?? null,
      tiktokUrl: input.tiktokUrl ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      heroTitle: input.heroTitle ?? null,
      heroSubtitle: input.heroSubtitle ?? null,
    },
    update: {
      siteName: input.siteName,
      logoUrl: input.logoUrl ?? null,
      whatsappNumber: input.whatsappNumber ?? null,
      shopeeUrl: input.shopeeUrl ?? null,
      instagramUrl: input.instagramUrl ?? null,
      tiktokUrl: input.tiktokUrl ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      heroTitle: input.heroTitle ?? null,
      heroSubtitle: input.heroSubtitle ?? null,
    },
    select: SETTINGS_SELECT,
  });

  return { ...row, updatedAt: row.updatedAt.toISOString() };
}