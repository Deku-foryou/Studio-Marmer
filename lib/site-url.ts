/**
 * Canonical public site origin.
 *
 * Used for:
 *  - `metadataBase` in app/layout.tsx (so OG/canonical URLs are absolute)
 *  - the product URL embedded in prefilled WhatsApp messages
 *
 * The value comes from `NEXT_PUBLIC_SITE_URL` (see `.env.example`). That
 * variable is the single source of truth: set it to the real domain on the
 * deployment, and every generated URL follows.
 *
 * WHY THERE IS STILL A FALLBACK, AND WHY IT DEPENDS ON NODE_ENV
 *
 * The bug this module was hardened against: the deployment was missing
 * `NEXT_PUBLIC_SITE_URL`, the fallback was an unconditional
 * `http://localhost:3000`, and the consequence was not a crash but a
 * *plausible-looking* wrong value — prefilled WhatsApp messages linked to
 * `http://localhost:3000/produk/...`, which no customer can open, and
 * canonical/OG URLs pointed at localhost too. A missing env var that
 * degrades into a wrong-but-valid URL is the worst failure mode there is:
 * nothing errors, the build succeeds, and the damage only shows up in a
 * message a customer has already sent to the shop owner.
 *
 * So the fallback is environment-scoped:
 *  - development → `http://localhost:3000`, which is genuinely correct there
 *    and keeps `npm run dev` working with no env file at all.
 *  - production  → the real public origin. If the deployment forgets the
 *    variable, the site degrades to the correct production domain instead of
 *    shipping localhost to customers.
 *
 * Setting `NEXT_PUBLIC_SITE_URL` explicitly still wins in both environments;
 * the constants below are only a safety net, never the intended configuration.
 *
 * This module exists so the origin string is not duplicated across components.
 *
 * `SITE_ORIGIN_PRODUCTION` / `SITE_ORIGIN_DEVELOPMENT` and the internal
 * `readOrigin` stay module-private: nothing outside this file needs the raw
 * constants, and keeping them internal stops a caller from re-implementing the
 * trailing-slash handling or bypassing the environment-scoped fallback.
 */

/** Real public origin. Used only when the env var is missing in production. */
const SITE_ORIGIN_PRODUCTION = 'https://studio-marmer.dockhosting.dev';

/** Local development origin. Used only when the env var is missing in dev. */
const SITE_ORIGIN_DEVELOPMENT = 'http://localhost:3000';

/**
 * Set once the "env var missing in production" warning has been emitted, so a
 * statically prerendered site does not print it on every request.
 */
let hasWarnedMissingEnv = false;

/**
 * Public origin with any trailing slash removed, so callers can safely
 * concatenate `${origin}/produk/...`.
 *
 * A trailing slash in the configured value is a very common mistake
 * (`https://example.com/`) and must not produce `https://example.com//produk/…`
 * in a customer's WhatsApp message, so it is stripped here, once, for every
 * caller.
 */
function readOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configured) {
    if (process.env.NODE_ENV === 'production' && !hasWarnedMissingEnv) {
      hasWarnedMissingEnv = true;
      console.warn(
        '[site-url] NEXT_PUBLIC_SITE_URL is not set. Falling back to ' +
          `${SITE_ORIGIN_PRODUCTION}. Set NEXT_PUBLIC_SITE_URL to the public ` +
          'origin (no trailing slash) in the deployment environment.'
      );
    }

    return (
      process.env.NODE_ENV === 'production'
        ? SITE_ORIGIN_PRODUCTION
        : SITE_ORIGIN_DEVELOPMENT
    );
  }

  return configured.replace(/\/+$/, '');
}

/** Public site origin, without a trailing slash. */
export function siteOrigin(): string {
  return readOrigin();
}

/** Absolute URL for an internal path, e.g. `/produk/foo`. */
export function absoluteUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${readOrigin()}${suffix}`;
}