/**
 * Admin toast catalogue — the single source of truth for notification text.
 *
 * WHY A CATALOGUE RATHER THAN MESSAGES AT THE CALL SITE
 * Two different paths deliver an admin notification:
 *
 *   1. a client component that already holds the action result pushes it
 *      straight into the toast context (no navigation involved);
 *   2. a server action that redirects hands the outcome to the destination page
 *      through a query parameter.
 *
 * Path 2 can only carry a short token in the URL, not a sentence — and putting a
 * sentence in a URL means reflecting untrusted-looking text into the address bar
 * and into browser history. So both paths reference the same key here: the
 * server action appends the key, the layout-level listener looks the sentence up,
 * and the text stays in one place that cannot drift between them.
 *
 * This module is deliberately framework-free: no `'use client'`, no
 * `'use server'`, no React import. Server actions and Client Components both
 * import it, and neither would be allowed to import the other.
 */

export type ToastTone = 'success' | 'error' | 'warning';

export interface ToastMessage {
  readonly tone: ToastTone;
  readonly message: string;
}

/**
 * Every notification the admin area can raise.
 *
 * Keys are URL-safe and stable — they travel in the address bar and land in
 * browser history, so they are written in kebab-case and never localised.
 * Sentences are Indonesian, matching every other string in the admin UI.
 *
 * An unknown key resolves to no toast at all rather than an error: the param is
 * attacker-controllable by anyone who edits the URL, and an unrecognised value
 * must never be able to render text or reach a database.
 */
export const ADMIN_TOASTS = {
  'produk-ditambahkan': {
    tone: 'success',
    message: 'Produk berhasil ditambahkan.',
  },
  'produk-diperbarui': {
    tone: 'success',
    message: 'Produk berhasil diperbarui.',
  },
  'produk-dihapus': {
    tone: 'success',
    message: 'Produk berhasil dihapus.',
  },
  'produk-gagal-dihapus': {
    tone: 'error',
    message: 'Produk gagal dihapus. Silakan coba lagi.',
  },
  'kategori-ditambahkan': {
    tone: 'success',
    message: 'Kategori berhasil ditambahkan.',
  },
  'kategori-diperbarui': {
    tone: 'success',
    message: 'Kategori berhasil diperbarui.',
  },
  'kategori-dihapus': {
    tone: 'success',
    message: 'Kategori berhasil dihapus.',
  },
  'kategori-gagal-dihapus': {
    tone: 'error',
    message: 'Kategori gagal dihapus. Silakan coba lagi.',
  },
  'pengaturan-tersimpan': {
    tone: 'success',
    message: 'Pengaturan website berhasil disimpan.',
  },
  'logo-dihapus': {
    tone: 'success',
    message: 'Logo berhasil dihapus.',
  },
  /**
   * Raised after a settings save that actually changed the hero photograph.
   *
   * This is the only warning in the catalogue because it is the only outcome
   * that is a success AND leaves a side effect behind: replacing the photograph
   * deliberately does not delete the previous Cloudinary asset, so the admin is
   * told rather than left to find the orphaned file later. It is worded as a
   * consequence of the action, not as a fault.
   */
  'gambar-hero-diperbarui': {
    tone: 'warning',
    message:
      'Gambar hero berhasil diperbarui. Foto sebelumnya tetap tersimpan di media library Cloudinary.',
  },
  /**
   * Upload failures.
   *
   * The uploaders also render this message inline beside the file input, which
   * is the more useful of the two placements — it is next to the control that
   * failed and it survives long enough to be read. This key exists for the case
   * where that inline surface is not on screen, and it deliberately carries the
   * same wording so the two never disagree.
   */
  'media-gagal-diunggah': {
    tone: 'error',
    message: 'Unggah gambar gagal. Silakan coba lagi.',
  },
} as const satisfies Record<string, ToastMessage>;

export type AdminToastCode = keyof typeof ADMIN_TOASTS;

/**
 * Query parameter carrying a notification across a redirect.
 *
 * Named `toast` because it is the vocabulary the whole admin area shares; a
 * reader of any redirect URL can tell at a glance that the param is a
 * notification rather than a filter or a pagination cursor.
 */
export const TOAST_QUERY_PARAM = 'toast';

/**
 * Narrows an arbitrary string to a known catalogue key.
 *
 * Used on the value read back out of the URL, so it is the boundary that stops a
 * hand-edited query string from becoming arbitrary UI text.
 *
 * `Object.hasOwn` rather than `in`: `in` walks the prototype chain, so
 * `'constructor' in ADMIN_TOASTS` and `'__proto__' in ADMIN_TOASTS` are both
 * true. A `?toast=constructor` in the address bar would then have passed this
 * guard and been indexed, handing `notify()` a function where a
 * `{ tone, message }` object was expected — untrusted input reaching the toast
 * payload. Own-property lookup closes that.
 */
export function isAdminToastCode(
  value: string | null | undefined
): value is AdminToastCode {
  return typeof value === 'string' && Object.hasOwn(ADMIN_TOASTS, value);
}

/** Looks a message up, returning null for anything unknown. */
export function getAdminToast(
  code: AdminToastCode
): ToastMessage {
  return ADMIN_TOASTS[code];
}

/**
 * Appends the notification key to a redirect target.
 *
 * Query-string aware: `createProduct` redirects to an edit screen that already
 * carries its own params in some flows, and a naive `?toast=` would drop them.
 * Existing params are preserved and the key is set, never blindly concatenated.
 */
export function buildFlashHref(href: string, code: AdminToastCode): string {
  const [path, existingQuery] = href.split('?');
  const params = new URLSearchParams(existingQuery ?? '');
  params.set(TOAST_QUERY_PARAM, code);

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * Removes the notification key from a path + query pair.
 *
 * The inverse of `buildFlashHref`, used by the layout listener to scrub the URL
 * once the message has been shown — otherwise the param stays in history and the
 * message reappears on a back navigation.
 */
export function stripFlashHref(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete(TOAST_QUERY_PARAM);

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
