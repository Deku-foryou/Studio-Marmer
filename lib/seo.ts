import type { MetadataRoute } from 'next';

/**
 * Sitemap / robots composition — pure, no Prisma, no `next/navigation`.
 *
 * Both `app/sitemap.ts` and `app/robots.ts` are thin adapters: they read the
 * database (or nothing) and hand the result to a function here. That keeps the
 * rules that actually matter — which URLs are allowed to be indexed, and which
 * are forbidden — in one testable place instead of inside a route file.
 */

/** Product fields the sitemap needs. Deliberately the two columns it uses. */
export interface SitemapProduct {
  readonly slug: string;
  readonly updatedAt: Date;
}

/**
 * The public, indexable routes.
 *
 * A closed list on purpose. An open-ended crawl of the route tree would pull in
 * `/admin`, the login page and the API, and a sitemap is the one file a crawler
 * trusts as an inventory — listing a private URL there is worse than omitting
 * it.
 *
 * There are no category URLs here because this site has none: a category is a
 * `?kategori=<slug>` filter on `/` (see `lib/catalog-query.ts`), rendered by
 * client-side buttons rather than links. Search and filter permutations are
 * infinite, carry no unique content, and are canonical to `/` — they belong in
 * neither the sitemap nor an index.
 */
const PUBLIC_ROUTES: ReadonlyArray<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/tentang-kami', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/galeri', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/kontak', changeFrequency: 'monthly', priority: 0.5 },
];

/** Origins a product URL may never have, whatever the database contains. */
function isPublicProductSlug(slug: string): boolean {
  return slug.length > 0 && !slug.includes('/') && !slug.startsWith('?');
}

/**
 * Builds the sitemap body from the products the storefront is allowed to show.
 *
 * Excluded by construction, not by convention:
 *  - admin, login and API routes  — never in `PUBLIC_ROUTES`
 *  - `/admin/*`                   — absent from the list
 *  - any URL with a query string  — the only product entries are `/produk/<slug>`
 *  - unavailable products         — the caller passes `isAvailable: true` rows
 *  - duplicates                   — slugs are unique in the schema and are
 *                                    additionally de-duplicated here, because a
 *                                    duplicate URL in a sitemap is a signal
 *                                    Google is entitled to ignore wholesale
 *
 * `lastModified` is the row's own `updatedAt` for products, and is omitted for
 * the static routes rather than guessed: stamping "now" on a page that has not
 * changed trains crawlers to distrust the field, which is the opposite of what
 * this file is for.
 */
export function buildSitemap(
  products: readonly SitemapProduct[],
  toAbsoluteUrl: (path: string) => string
): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: toAbsoluteUrl(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const seen = new Set<string>(PUBLIC_ROUTES.map((route) => route.path));

  for (const product of products) {
    if (!isPublicProductSlug(product.slug)) continue;

    const path = `/produk/${product.slug}`;
    if (seen.has(path)) continue;
    seen.add(path);

    entries.push({
      url: toAbsoluteUrl(path),
      lastModified: product.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  return entries;
}

/**
 * robots.txt.
 *
 * `allow: '/'` plus a short disallow list rather than an allow-list: the
 * storefront is public and most of it should be crawled, and enumerating what is
 * crawlable would silently hide any page added later.
 *
 * `/admin` is listed even though those pages already send `noindex` via their
 * own metadata. The two do different jobs — the meta tag keeps the admin area
 * out of the index if it is ever discovered, the disallow stops the crawler
 * spending budget on pages that are behind authentication anyway.
 *
 * `/api` is listed because it is a JSON endpoint, not a document; there is
 * nothing in it for a crawler and it must never be indexed.
 */
export function buildRobots(sitemapUrl: string): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        /*
         * Prefix matching, so `/admin` already covers `/admin/login` and every
         * dashboard route, and `/api` covers `/api/search/suggestions`. Listing
         * the trailing-slash variants too would be redundant noise in a file
         * crawlers re-read on every visit.
         */
        disallow: ['/admin', '/api'],
      },
    ],
    sitemap: sitemapUrl,
  };
}