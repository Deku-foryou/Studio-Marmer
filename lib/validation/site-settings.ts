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
 * Optional logo reference.
 *
 * Like product photos, a logo may either be an absolute http(s) URL or a
 * site-relative path (`/placeholders/logo.png`). Binary upload is a later
 * phase, so this stays a plain text field.
 */
const optionalLogoUrl = z
  .string()
  .trim()
  .max(500, 'Maksimal 500 karakter.')
  .transform((value) => (value.length === 0 ? undefined : value))
  .refine(
    (value) => {
      if (value === undefined) return true;
      if (value.startsWith('/')) return true;
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'URL logo tidak valid. Gunakan tautan http(s) atau path yang diawali /.' }
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

  logoUrl: optionalLogoUrl,

  whatsappNumber: optionalWhatsAppNumber,
  email: optionalEmail,
  address: optionalText(255, 'Alamat maksimal 255 karakter.'),

  shopeeUrl: optionalExternalUrl('Shopee'),
  instagramUrl: optionalExternalUrl('Instagram'),
  tiktokUrl: optionalExternalUrl('TikTok'),

  heroTitle: optionalText(200, 'Judul hero maksimal 200 karakter.'),
  heroSubtitle: optionalText(500, 'Subtitle hero maksimal 500 karakter.'),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;