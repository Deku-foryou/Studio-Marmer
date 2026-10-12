import type { NextConfig } from 'next';

/* ────────────────────────────────────────────────────────────────────────────
 * Security headers
 *
 * Every directive below maps to something this codebase demonstrably does.
 * Nothing here is a speculative allow-list entry: each origin or scheme has a
 * concrete caller in `app/`, `components/` or `lib/`, and the reason is written
 * next to it. If you add a third-party embed or an analytics script, add its
 * origin here at the same time — and only there.
 * ──────────────────────────────────────────────────────────────────────────── */

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Reporting escape hatch.
 *
 * A `Content-Security-Policy-Report-Only` header does not block anything: the
 * browser logs every violation to the console while the page keeps working.
 * This project has no `report-uri` / `report-to` endpoint (no Sentry, no
 * CSP collector), so there is no way to aggregate violations server-side — but
 * the browser console is enough to validate a directive change by hand.
 *
 * Set `CSP_REPORT_ONLY=true` in the environment to emit the report-only header
 * *in addition to* the enforcing one, walk the site, and read the console. The
 * enforcing header stays on, so this never silently downgrades a live site to
 * an unblocked state; if you genuinely want to disable enforcement, delete the
 * enforcing header entry rather than relying on this flag.
 */
const reportOnly = process.env.CSP_REPORT_ONLY === 'true';

/**
 * Whether HSTS may be sent at all.
 *
 * `Strict-Transport-Security` is only honoured over HTTPS, and it is a promise
 * this project cannot revoke for a visitor's browser once it is cached. Nothing
 * in this repository records the production host or the TLS terminator — there
 * is no `vercel.json`, Dockerfile or deployment note — so the only trustworthy
 * signal available at config time is `NEXT_PUBLIC_SITE_URL`, which the README
 * and `.env.example` both define as "the real domain in production".
 *
 * Consequence: HSTS is emitted only when the app is running a production build
 * *and* the configured public origin is https. Behind a plain-HTTP local
 * server, or on any host that still terminates TLS elsewhere without setting
 * this variable to its https origin, no HSTS header is sent. That is the safe
 * failure mode: a missing HSTS header costs nothing, a wrong one locks users
 * out of their own site.
 *
 * `includeSubDomains` is deliberately absent. It extends the policy to every
 * subdomain, present and future, which is a promise this repository cannot
 * make: there is no deployment config, CI workflow or host inventory committed
 * here, so nothing records which subdomains exist or whether they are HTTPS.
 * A `www` or staging host still served over plain HTTP would be pinned to
 * HTTPS-only by a browser that saw this header and would refuse to load until
 * its certificate is fixed. `max-age` alone covers the production host, which
 * is the only origin this project can actually vouch for. Re-add it once the
 * subdomain inventory is known and every one of them is confirmed HTTPS.
 */
const hstsEnabled =
  !isDev && /^https:\/\//i.test(process.env.NEXT_PUBLIC_SITE_URL ?? '');

/**
 * Content-Security-Policy, assembled from a directive list.
 *
 * Built once and reused: the enforcing and report-only headers must be the
 * *same* policy string, so it is computed a single time here rather than
 * rebuilt per header (two independent builds could drift and make a
 * report-only run quietly disagree with what is actually enforced).
 */
function buildCsp(): string {
  /*
   * script-src
   *
   * `'self'` covers every `/_next/static/**` chunk and the Auth.js route
   * handler bundle. `'unsafe-inline'` is required because the App Router
   * bootstraps each response with inline `<script>` tags that stream the RSC
   * payload (`self.__next_f.push(...)`) — they are generated per request, so
   * there is nothing to hash and nothing to allow-list by origin.
   *
   * `'unsafe-eval'` is development-only: React's dev build uses `eval` to
   * reconstruct server-side component stacks in the browser. Production React
   * does not.
   *
   * The stricter alternative is a per-request nonce generated in `proxy.ts`.
   * That was rejected for this phase: nonces are only applied while a page is
   * dynamically rendered, and `/kontak`, `/galeri`, `/tentang-kami`,
   * `/admin/login`, `/_not-found` and `/_global-error` are all statically
   * prerendered today. Switching to nonces means forcing every one of those
   * routes dynamic (`await connection()`) and giving up static delivery for the
   * whole site — a deliberate architecture decision, not a header tweak. See
   * the Phase 2 report for that follow-up.
   */
  const scriptSrc = ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])];

  /*
   * script-src-attr
   *
   * Inline event-handler *attributes* (`onclick="..."`) are a distinct CSP
   * check from inline `<script>` elements. React never emits them — `onClick`
   * is registered through `addEventListener` — so this directive can be closed
   * completely. It is the part of `script-src` that meaningfully limits
   * DOM-XSS payloads which inject attributes rather than script tags.
   */
  const scriptSrcAttr = ["'none'"];

  /*
   * style-src
   *
   * `'unsafe-inline'` is required by the product detail page
   * (`app/(store)/produk/[slug]/page.tsx` sets `style={{ animationDelay }}`
   * on a dozen reveal wrappers), by the filter bar's inline `backgroundImage`,
   * and by the hero's admin-supplied backdrop override. Those are style
   * *attributes*, so they fall under `style-src-attr`; the current code has no
   * injected `<style>` blocks that would justify relaxing `<style>` handling,
   * but the two cannot be separated without `'unsafe-hashes'` plus a hash per
   * distinct value, which is not maintainable for animation delays.
   */
  const styleSrc = ["'self'", "'unsafe-inline'"];

  /*
   * img-src
   *
   * `'self'` — local assets in `public/images/` and everything served through
   * the `next/image` optimizer at `/_next/image`.
   * `data:`    — the inline SVG chevron in `components/filters/FilterBar.tsx`.
   * `blob:`    — not currently used, but `next/image` generates blob-based
   *              previews for client-side image work and the admin uploaders
   *              are the only surface that renders user-selected files.
   * `res.cloudinary.com` — delivery host for admin-uploaded product, category,
   *              gallery and site imagery. Rendered directly (not proxied) by
   *              `components/layout/SiteLogo.tsx` and as the hero backdrop in
   *              `components/layout/HeroSection.tsx`.
   * `images.unsplash.com` — declared in `images.remotePatterns` below. It is
   *              currently unreferenced by any component; it is allowed here
   *              purely so the CSP and the image allow-list cannot drift apart
   *              and produce a confusing optimizer-vs-CSP failure later.
   */
  const imgSrc = [
    "'self'",
    'data:',
    'blob:',
    'https://res.cloudinary.com',
    'https://images.unsplash.com',
  ];

  /*
   * connect-src
   *
   * `'self'` — RSC payload fetches, navigation prefetches, Server Action
   * POSTs and the Auth.js `/api/auth/*` calls the admin login form makes.
   * `https://api.cloudinary.com` — the unsigned upload in
   * `lib/cloudinary-upload.ts` posts the file straight from the browser.
   * `ws:`/`wss:` — development only, for the dev-server HMR socket.
   */
  const connectSrc = [
    "'self'",
    'https://api.cloudinary.com',
    ...(isDev ? ['ws:', 'wss:'] : []),
  ];

  /*
   * worker-src — development only. Turbopack's dev overlay and source-map
   * reader run in a worker; production has no worker anywhere in the codebase.
   */
  const workerSrc = ["'self'", ...(isDev ? ['blob:'] : [])];

  const directives: Array<[string, string[]]> = [
    // Umbrella rule. Every fetch directive below is explicit, so nothing is
    // resolved by accident.
    ['default-src', ["'self'"]],
    ['base-uri', ["'self'"]],
    ['object-src', ["'none'"]],
    ['script-src', scriptSrc],
    ['script-src-attr', scriptSrcAttr],
    ['style-src', styleSrc],
    ['img-src', imgSrc],
    ['font-src', ["'self'"]], // `next/font` self-hosts Inter; no external font CDN.
    ['connect-src', connectSrc],
    ['worker-src', workerSrc],
    ['manifest-src', ["'self'"]],
    // No iframe exists in this app. Stated explicitly so a future `<iframe>`
    // embed has to make a conscious edit here.
    ['frame-src', ["'none'"]],
    // Paired with `X-Frame-Options: DENY`. `frame-ancestors` is the modern,
    // correctly-behaved control; the legacy header stays for old browsers.
    ['frame-ancestors', ["'none'"]],
    // Admin login is a Server Action POST; Server Actions never need to submit
    // a form to a third-party origin.
    ['form-action', ["'self'"]],
  ];

  /*
   * `upgrade-insecure-requests` is production-only on purpose. In development
   * the app is served over plain `http://localhost`, and browsers apply this
   * directive to localhost too — the app would attempt to load its own chunks
   * over https and fail. It is redundant with HSTS on a correct HTTPS
   * deployment, but it is the one directive that still helps a first visit on
   * a host that has not yet been pinned.
   */
  if (!isDev) {
    directives.push(['upgrade-insecure-requests', []]);
  }

  return directives
    .map(([name, values]) => (values.length > 0 ? `${name} ${values.join(' ')}` : name))
    .join('; ');
}

/** The policy string, built once at module load. */
const csp = buildCsp();

const securityHeaders: Array<{ key: string; value: string }> = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: csp,
  },
  // Defence in depth against a script that reaches the DOM with the origin
  // already attached. Nothing in this codebase uses the camera, microphone,
  // geolocation, payment, USB or MIDI APIs.
  {
    key: 'Permissions-Policy',
    value: [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'midi=()',
      'interest-cohort=()',
    ].join(', '),
  },
];

if (hstsEnabled) {
  // Two years, host only — no `includeSubDomains`, no `preload`. See the
  // `hstsEnabled` comment above for why neither is safe to assert here.
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000',
  });
}

const nextConfig: NextConfig = {
  /*
   * Removes the `X-Powered-By: Next.js` response header. It advertises the
   * exact framework and version to anyone probing the site, which is free
   * reconnaissance and buys nothing.
   */
  poweredByHeader: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/photo-**',
      },
      /**
       * Cloudinary delivery host for product photography.
       *
       * Admin product photos are uploaded straight to Cloudinary and stored as
       * `secure_url` values on ProductImage.imageUrl, which the storefront then
       * renders through next/image. next/image refuses any host that is not
       * allow-listed here, so without this pattern every product photo throws
       * "Invalid src prop ... hostname is not configured under images".
       *
       * The hostname is a single global constant for all Cloudinary accounts -
       * the cloud name only ever appears as the first path segment of the URL,
       * never as the host. That is what keeps this entry cloud-agnostic: adding
       * a second Cloudinary account needs no config change, and no cloud name is
       * duplicated here.
       *
       * Kept in sync with `img-src` in the Content-Security-Policy above.
       */
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  /**
   * Applied to every route, including statically prerendered pages — headers
   * are attached by the router before the response body is served, so the HTML
   * document always carries them.
   *
   * A CSP on a `/_next/static/**` chunk is inert (it is not a document) and a
   * CSP on `/_next/image` is meaningless, but scoping them out would require
   * a regex `source` that adds routing complexity for no security gain. One
   * rule is easier to audit than two.
   */
  async headers() {
    const entries = [...securityHeaders];

    if (reportOnly) {
      entries.push({
        key: 'Content-Security-Policy-Report-Only',
        value: csp,
      });
    }

    return [
      {
        source: '/:path*',
        headers: entries,
      },
    ];
  },
};

export default nextConfig;
