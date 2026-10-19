import type { MetadataRoute } from 'next';

import { getSitemapProducts } from '@/lib/data/products';
import { buildSitemap } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site-url';

/**
 * `/sitemap.xml` — the URL inventory submitted to Google Search Console.
 *
 * Rendered per request rather than at build time. The catalog lives in MySQL and
 * the admin can publish or retire a product at any moment; a sitemap baked into
 * the build would keep advertising pieces that no longer exist and would miss
 * new ones until the next deploy, which is exactly how a sitemap starts being
 * ignored.
 *
 * Every URL is absolute and built through `absoluteUrl`, so the file can only
 * ever emit the configured public origin — never `localhost`, which is what a
 * relative or env-less build would produce. See `lib/site-url.ts`.
 *
 * What is deliberately NOT here: `/admin`, `/admin/login`, `/api/*`, any `?q=`
 * or `?kategori=` permutation, and any product the storefront would not list.
 * The rules live in `lib/seo.ts` and are covered by the unit suite.
 */
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getSitemapProducts();

  return buildSitemap(products, absoluteUrl);
}