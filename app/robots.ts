import type { MetadataRoute } from 'next';

import { buildRobots } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site-url';

/**
 * `/robots.txt`
 *
 * Two jobs, both required for crawling to work properly:
 *
 *  1. It states the crawl policy for the public storefront. Everything public
 *     is crawlable; only the admin area and the JSON API are excluded.
 *  2. It points at the sitemap with an ABSOLUTE url. A relative
 *     `Sitemap:` line is ignored by Google, and this file is the first thing a
 *     crawler reads — building it through `absoluteUrl` means it always names
 *     the configured public origin rather than `localhost`.
 *
 * Note that robots.txt does not *protect* anything: a disallowed URL can still
 * be fetched if its address is known. The admin area is kept out of the index
 * by the `noindex` metadata in `app/(admin)/admin/layout.tsx`; this file simply
 * stops crawlers spending budget on it.
 */
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return buildRobots(absoluteUrl('/sitemap.xml'));
}