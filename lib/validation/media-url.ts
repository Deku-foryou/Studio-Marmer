/**
 * Shared media-URL validation.
 *
 * WHY THIS EXISTS
 * Four validators in this project accept "a picture reference that may be an
 * absolute http(s) URL or a site-relative path": product images, gallery
 * photos, the site hero, and (as of this fix) the category image. Each needs the
 * same guarantee, and each originally spelled it slightly differently — the
 * category one used a `/^https?:\/\//` regex, which accepts `http://` because
 * the regex only anchors the prefix and never checks that a host follows.
 *
 * One implementation means one fix and one place to audit.
 *
 * WHAT IS ACCEPTED
 *   - an absolute URL whose protocol is `http:` or `https:`
 *   - a root-relative path: `/images/hero-marble-vanity-1672.webp`
 *
 * WHAT IS REJECTED, AND WHY
 *   - `http://` / `https://` with no host — `new URL()` throws on these, so a
 *     bare scheme can never reach the database as a "valid" image reference.
 *   - `javascript:`, `data:`, `file:`, `ftp:` — not `http:`/`https:`. A
 *     `javascript:` value stored here would later be rendered into an `<img>`
 *     src or a CSS `url()`; the http/https allow-list is what stops it.
 *   - protocol-relative `//example.com/a.png` — it starts with `/`, so a naive
 *     "starts with a slash" test would wave it through, yet the browser resolves
 *     it against whatever scheme the page was served with. This app is
 *     HTTPS-only in production, but the value is ambiguous and nothing in the
 *     codebase emits it, so it is refused rather than guessed at.
 *
 * Note the leading-slash branch runs BEFORE URL parsing, which is what keeps
 * root-relative paths working: `new URL('/images/x.webp')` throws, because a
 * relative reference has no scheme of its own.
 */

/**
 * True when `value` is an acceptable absolute http(s) URL or root-relative path.
 *
 * `value` is expected to be trimmed already; every caller applies `.trim()`
 * before refining.
 */
export function isAllowedMediaUrl(value: string): boolean {
  // Root-relative path. The `!startsWith('//')` guard rejects the
  // protocol-relative form, which would otherwise pass this branch.
  if (value.startsWith('/')) return !value.startsWith('//');

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    // A malformed absolute URL - including a bare `http://` with no host.
    return false;
  }
}

/**
 * Characters that would break out of the context a media URL is interpolated
 * into.
 *
 * These validators feed an `<img src>`, a `next/image` `src`, and a CSS
 * `url("…")` declaration. Quote, paren, whitespace and angle characters have no
 * legitimate place in an image reference we produce, and each one is a way to
 * terminate the attribute or declaration it was spliced into and append new
 * content. Rejecting them here means a crafted form post cannot do that.
 *
 * No real Cloudinary delivery URL contains any of these characters.
 */
export function hasUnsafeUrlCharacters(value: string): boolean {
  return /["'()\s<>]/.test(value);
}
