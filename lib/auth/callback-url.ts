/**
 * Validation for the post-login redirect target.
 *
 * `callbackUrl` arrives from the query string, i.e. from whoever crafted the
 * link the admin clicked. `AdminLoginForm` pushes it after a successful sign-in
 * with `redirect: false`, which means Auth.js's own callbackUrl handling never
 * runs — the form does the navigation itself.
 *
 * That made the login page an open redirect. Proven, not assumed: with a real
 * admin session, `/admin/login?callbackUrl=http://<attacker>/pwned` left the
 * browser issuing a request to that host immediately after a successful login.
 * An admin who follows a phishing link types their real password into a real,
 * correctly-certificated Studio Marmer login page and is then handed straight to
 * the attacker's site still holding a valid session.
 *
 * So the rule is narrow on purpose: a callback must be an absolute PATH on this
 * origin. Anything that could name a different origin is replaced by the
 * fallback rather than "cleaned up", because repairing an attacker-supplied URL
 * is how these bugs come back.
 */

/** Where to go when the callback is missing or unusable. */
const DEFAULT_CALLBACK = '/admin';

/**
 * Returns `raw` only when it is a safe same-origin path, otherwise the fallback.
 *
 * Rejected: anything without a leading slash (`https://evil.com`,
 * `javascript:…`), protocol-relative `//host`, backslash forms (`/\host`,
 * `/\/host`, which several browsers normalise to `//host`), embedded
 * backslashes anywhere, and control characters.
 *
 * Accepted: ordinary internal paths including query strings, e.g.
 * `/admin/produk?page=2`.
 */
export function safeCallbackPath(
  raw: string | null | undefined,
  fallback: string = DEFAULT_CALLBACK
): string {
  if (typeof raw !== 'string') return fallback;

  const value = raw.trim();
  if (value.length === 0) return fallback;

  // Must be rooted at this origin. This alone rejects absolute URLs and any
  // scheme, since neither starts with a single slash.
  if (!value.startsWith('/')) return fallback;

  // `//host` and `/\host` are same-shape protocol-relative URLs.
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;

  // A backslash anywhere can be folded into `//` by URL normalisation, so a
  // path containing one is not trustworthy even when it starts correctly.
  if (value.includes('\\')) return fallback;

  // Control characters (including a raw newline or tab used to split a header
  // or a log line) have no place in a navigation target.
  if (/[\u0000-\u001F\u007F]/.test(value)) return fallback;

  // Defence in depth: a scheme can never reach here given the leading-slash
  // check, but this documents the intent and survives a future refactor.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return fallback;

  return value;
}