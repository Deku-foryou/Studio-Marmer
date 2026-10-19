import { describe, it, expect, afterEach, vi } from 'vitest';

import { buildRobots, buildSitemap } from '@/lib/seo';
import { absoluteUrl, siteOrigin } from '@/lib/site-url';

/**
 * Guards the sitemap and robots rules.
 *
 * These two files are the entire discovery surface for a search engine, and
 * almost every failure mode is silent: a private URL listed in a sitemap, a
 * canonical pointing at localhost, or a duplicate entry will not throw - the
 * crawler just quietly stops treating the site as authoritative.
 */

const ORIGIN = 'https://studio-marmer.dockhosting.dev';

/**
 * A deterministic stand-in for `absoluteUrl`.
 *
 * The real helper reads `NEXT_PUBLIC_SITE_URL`, which is not set in the test
 * environment and would resolve to localhost — making these assertions depend on
 * ambient state. The wiring between the two is asserted separately at the bottom
 * of the file.
 */
const toAbsolute = (path: string) =>
  `${ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;

function product(slug: string, updatedAt = new Date('2026-01-15T00:00:00Z')) {
  return { slug, updatedAt };
}

describe('buildSitemap', () => {
  const sitemap = buildSitemap(
    [product('luna'), product('lurian'), product('cubis')],
    toAbsolute
  );
  const urls = sitemap.map((entry) => entry.url);

  it('includes every public static page', () => {
    expect(urls).toContain(`${ORIGIN}/`);
    expect(urls).toContain(`${ORIGIN}/tentang-kami`);
    expect(urls).toContain(`${ORIGIN}/galeri`);
    expect(urls).toContain(`${ORIGIN}/kontak`);
  });

  it('includes a product URL per available product, built from its slug', () => {
    expect(urls).toContain(`${ORIGIN}/produk/luna`);
    expect(urls).toContain(`${ORIGIN}/produk/lurian`);
    expect(urls).toContain(`${ORIGIN}/produk/cubis`);
  });

  it('never lists an admin, login or API URL', () => {
    for (const url of urls) {
      expect(url).not.toMatch(/\/admin/);
      expect(url).not.toMatch(/\/login/);
      expect(url).not.toMatch(/\/api/);
    }
  });

  it('never lists a query-string URL', () => {
    for (const url of urls) {
      expect(url).not.toContain('?');
      expect(url).not.toContain('kategori');
      expect(url).not.toContain('sort=');
    }
  });

  it('emits no duplicate URLs', () => {
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('uses absolute production URLs, never localhost', () => {
    for (const url of urls) {
      expect(url.startsWith('https://')).toBe(true);
      expect(url).not.toContain('localhost');
    }
  });

  it("stamps each product with the row's own updatedAt", () => {
    const luna = sitemap.find((e) => e.url.endsWith('/produk/luna'));
    expect(luna?.lastModified).toEqual(new Date('2026-01-15T00:00:00Z'));
  });

  it('omits lastModified on static routes rather than stamping "now"', () => {
    const home = sitemap.find((e) => e.url === `${ORIGIN}/`);
    expect(home?.lastModified).toBeUndefined();
  });

  it('de-duplicates a repeated slug', () => {
    const dupes = buildSitemap(
      [product('luna'), product('luna'), product('luna')],
      toAbsolute
    );
    const lunaUrls = dupes
      .map((e) => e.url)
      .filter((u) => u.endsWith('/produk/luna'));

    expect(lunaUrls).toHaveLength(1);
  });

  it('still produces the static pages when the catalog is empty', () => {
    const empty = buildSitemap([], toAbsolute);
    expect(empty.map((e) => e.url)).toEqual([
      `${ORIGIN}/`,
      `${ORIGIN}/tentang-kami`,
      `${ORIGIN}/galeri`,
      `${ORIGIN}/kontak`,
    ]);
  });

  it('rejects a slug that would escape the product path', () => {
    const hostile = buildSitemap(
      [product('../admin'), product('/produk/x'), product('a/b')],
      toAbsolute
    );
    const productUrls = hostile.map((e) => e.url);

    expect(productUrls).not.toContain(`${ORIGIN}/admin`);
    expect(productUrls).not.toContain(`${ORIGIN}/produk/produ/x`);
  });

  it('gives the homepage the highest priority', () => {
    const home = sitemap.find((e) => e.url === `${ORIGIN}/`);
    expect(home?.priority).toBe(1);
  });
});

describe('buildRobots', () => {
  const robots = buildRobots(toAbsolute('/sitemap.xml'));

  /*
   * Next types `robots` as a union: `rules` may be a single rule or an array of
   * them, and `sitemap` may be one URL or several. `buildRobots` always returns
   * the single-rule / single-URL form, so these narrow the union to that shape
   * instead of scattering non-null assertions through the assertions.
   */
  const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
  const rule = rules[0];
  const sitemapUrl = Array.isArray(robots.sitemap)
    ? robots.sitemap[0]
    : robots.sitemap;

  it('allows crawling the public storefront', () => {
    expect(rule.userAgent).toBe('*');
    expect(rule.allow).toBe('/');
  });

  it('disallows the admin area and the JSON API', () => {
    // Prefix rules: `/admin` covers `/admin/login` and every dashboard route.
    expect(rule.disallow).toEqual(expect.arrayContaining(['/admin', '/api']));
    expect(rule.disallow).not.toContain('/');
  });

  it('advertises the sitemap with an absolute production URL', () => {
    expect(sitemapUrl).toBe(`${ORIGIN}/sitemap.xml`);
    expect(sitemapUrl?.startsWith('https://')).toBe(true);
    expect(sitemapUrl).not.toContain('localhost');
  });

  it('never disallows the public pages it just listed', () => {
    const blocked = (rule.disallow ?? []) as string[];
    for (const path of ['/tentang-kami', '/galeri', '/kontak']) {
      expect(blocked).not.toContain(path);
    }
  });
});

/**
 * The wiring test: `app/sitemap.ts` and `app/robots.ts` pass the REAL
 * `absoluteUrl` in, so the origin they emit is whatever the deployment
 * configures. This is the assertion that actually catches a sitemap shipping
 * `localhost` URLs — the failure this project already had once, when the
 * deployment was missing `NEXT_PUBLIC_SITE_URL`.
 */
describe('sitemap/robots use the configured public origin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('emits production URLs when NEXT_PUBLIC_SITE_URL is the real domain', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', ORIGIN);

    expect(siteOrigin()).toBe(ORIGIN);
    expect(absoluteUrl('/sitemap.xml')).toBe(`${ORIGIN}/sitemap.xml`);

    const sitemap = buildSitemap([product('luna')], absoluteUrl);
    for (const entry of sitemap) {
      expect(entry.url.startsWith(ORIGIN)).toBe(true);
      expect(entry.url).not.toContain('localhost');
    }

    expect(buildRobots(absoluteUrl('/sitemap.xml')).sitemap).toEqual(
      `${ORIGIN}/sitemap.xml`
    );
  });

  it('emits an https sitemap URL even when the variable is missing in production', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    vi.stubEnv('NODE_ENV', 'production');
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(absoluteUrl('/sitemap.xml')).toBe(
      'https://studio-marmer.dockhosting.dev/sitemap.xml'
    );
  });
});