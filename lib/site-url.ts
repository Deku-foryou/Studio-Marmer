/**
 * Canonical public site origin.
 *
 * Used for:
 *  - `metadataBase` in app/layout.tsx (so OG/canonical URLs are absolute)
 *  - the product URL embedded in prefilled WhatsApp messages
 *
 * The value comes from `NEXT_PUBLIC_SITE_URL` (see `.env.example`). The
 * localhost fallback exists only so local development works without any env
 * file; in production the variable must be set to the real domain.
 *
 * This module exists so the origin string is not duplicated across components.
 */

/** Fallback used only when the environment variable is absent. */
export const SITE_ORIGIN_FALLBACK = 'http://localhost:3000';

/**
 * Public origin with any trailing slash removed, so callers can safely
 * concatenate `${origin}/produk/...`.
 */
export function getSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const origin = configured && configured.length > 0
    ? configured
    : SITE_ORIGIN_FALLBACK;

  return origin.replace(/\/+$/, '');
}

/** Absolute URL for an internal path, e.g. `/produk/foo`. */
export function absoluteUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteOrigin()}${suffix}`;
}
