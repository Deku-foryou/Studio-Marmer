import { z } from 'zod';

import { normalizeWhatsAppNumber } from '@/lib/utils';

/**
 * Server-side validation for the site settings singleton (id = 1).
 *
 * The admin form is a full replacement of the record, so there is a single
 * schema rather than separate create/update schemas: the row always exists and
 * every field is submitted on each save.
 *
 * These schemas are the single source of truth for what a setting may contain.
 * They run inside the server action only - the form's HTML attributes are a
 * usability aid and never a substitute for this.
 *
 * All user-facing messages are in Indonesian, matching the admin UI.
 */

/** Trimmed string, or `undefined` when the admin left the field blank. */
const optionalText = (max: number, message?: string) =>
  z
    .string()
    .trim()
    .max(max, message ?? `Maksimal ${max} karakter.`)
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional();

/**
 * Optional absolute http(s) URL.
 *
 * Used for the marketplace and social channels, which always point at an
 * external site. Site-relative paths are deliberately NOT accepted here.
 */
const optionalExternalUrl = (label: string, max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter.`)
    .transform((value) => (value.length === 0 ? undefined : value))
    .refine(
      (value) => {
        if (value === undefined) return true;
        try {
          const url = new URL(value);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: `Tautan ${label} tidak valid. Gunakan tautan http(s).` }
    )
    .optional();

/**
 * Optional media reference for an admin-managed image.
 *
 * Covers both the two shapes a real value can take: an absolute https URL
 * returned by Cloudinary's unsigned upload, and a site-relative path (`/images/
 * hero-…webp`) for a bundled asset or a row that predates Cloudinary hosting.
 * http is tolerated only for the relative-path case being absent, so a value
 * pasted from an old form still saves rather than failing the whole settings
 * form.
 */
const optionalMediaUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(500, 'Maksimal 500 karakter.')
    .transform((value) => (value.length === 0 ? undefined : value))
    .refine((value) => {
      if (value === undefined) return true;
      if (value.startsWith('/')) return true;
      try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:';
      } catch {
        return false;
      }
    })
    .refine(
      // A media URL is interpolated into a CSS `url()` and into an <Image src>,
      // both of which reject a value carrying quote or paren characters. Banning
      // them here means a crafted form post cannot break out of the declaration
      // it was spliced into; no legitimate Cloudinary URL contains them.
      (value) => value === undefined || !/["'()\s<>]/.test(value),
      { message: `URL ${label} tidak valid.` }
    )
    .optional();

/**
 * Optional Cloudinary public id.
 *
 * The image is uploaded from the browser by an unsigned preset, so the public id
 * arrives as a form field and is exactly as untrusted as any other input — it is
 * shape-checked here rather than trusted. A single relative path segment, no
 * scheme, no whitespace, bounded length.
 */
const optionalPublicId = z
  .string()
  .trim()
  .max(255, 'Maksimal 255 karakter.')
  .transform((value) => (value.length === 0 ? undefined : value))
  .refine(
    (val) => val === undefined || /^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(val),
    'Public ID tidak valid.'
  )
  .optional();

/** Optional email address. */
const optionalEmail = z
  .string()
  .trim()
  .max(255, 'Maksimal 255 karakter.')
  .transform((value) => (value.length === 0 ? undefined : value))
  .refine(
    (value) => value === undefined || z.email().safeParse(value).success,
    { message: 'Format email tidak valid.' }
  )
  .optional();

/**
 * Optional WhatsApp contact, stored as digits only.
 *
 * Admins paste whatever they have ("+62 812-3456-7890", "0812…",
 * "https://wa.me/628123456789"). `normalizeWhatsAppNumber` reduces all of
 * those to the country-code form wa.me expects, so a full wa.me URL is never
 * stored as the number itself.
 */
const optionalWhatsAppNumber = z
  .string()
  .trim()
  .max(30, 'Maksimal 30 karakter.')
  .transform((value) => (value.length === 0 ? undefined : value))
  .transform((value) => (value === undefined ? undefined : normalizeWhatsAppNumber(value) ?? ''))
  .refine(
    (value) => value === undefined || /^\d{8,15}$/.test(value),
    { message: 'Nomor WhatsApp tidak valid. Gunakan format 62… (contoh: 6281234567890).' }
  )
  .optional();

export const siteSettingsSchema = z.object({
  siteName: z
    .string()
    .trim()
    .min(1, 'Nama studio wajib diisi.')
    .max(120, 'Nama studio maksimal 120 karakter.'),

  logoUrl: optionalMediaUrl('logo'),
  logoPublicId: optionalPublicId,

  whatsappNumber: optionalWhatsAppNumber,
  email: optionalEmail,
  address: optionalText(255, 'Alamat maksimal 255 karakter.'),

  shopeeUrl: optionalExternalUrl('Shopee'),
  instagramUrl: optionalExternalUrl('Instagram'),
  tiktokUrl: optionalExternalUrl('TikTok'),

  heroTitle: optionalText(200, 'Judul hero maksimal 200 karakter.'),
  heroSubtitle: optionalText(500, 'Subtitle hero maksimal 500 karakter.'),
  heroImageUrl: optionalMediaUrl('gambar hero'),
  heroImagePublicId: optionalPublicId,
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;

/**
 * Resolves an image column pair for persistence.
 *
 * `url` and `publicId` are written and cleared as a pair, matching
 * `toCategoryImageColumns` in lib/validation/category.ts. A URL with no public
 * id is still stored: the image renders perfectly well today, and the id is
 * only needed if the asset has to be identified later. A public id with no URL
 * would describe nothing renderable, so it is dropped instead.
 */
export function toSiteMediaColumns(input: {
  url?: string;
  publicId?: string;
}): { url: string | null; publicId: string | null } {
  const url = input.url ?? null;

  return {
    url,
    publicId: url === null ? null : (input.publicId ?? null),
  };
}
