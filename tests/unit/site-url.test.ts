import { describe, it, expect, afterEach, vi } from 'vitest';
import { absoluteUrl, siteOrigin } from '@/lib/site-url';

/**
 * Guards the prefilled WhatsApp message bug: the product detail page embeds
 * `absoluteUrl('/produk/<slug>')` in the message a customer sends to the shop
 * owner. A wrong origin there is invisible at build time and only surfaces as a
 * dead `http://localhost:3000/...` link inside a real WhatsApp conversation, so
 * it is pinned here instead.
 *
 * `process.env` is mutated and restored per test; `readOrigin()` reads the
 * variable on every call (it is not cached at module load), so no module reset
 * is needed.
 */
describe('siteOrigin', () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = original;
    }
  });

  it('uses NEXT_PUBLIC_SITE_URL when it is set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://studio-marmer.dockhosting.dev';
    expect(siteOrigin()).toBe('https://studio-marmer.dockhosting.dev');
  });

  it('strips trailing slashes so callers cannot produce a double slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://studio-marmer.dockhosting.dev/';
    expect(siteOrigin()).toBe('https://studio-marmer.dockhosting.dev');

    process.env.NEXT_PUBLIC_SITE_URL = 'https://studio-marmer.dockhosting.dev///';
    expect(siteOrigin()).toBe('https://studio-marmer.dockhosting.dev');
  });

  it('ignores a whitespace-only value instead of emitting a broken URL', () => {
    process.env.NEXT_PUBLIC_SITE_URL = '   ';
    expect(siteOrigin()).toBe('http://localhost:3000');
  });

  it('falls back to localhost in development when the variable is absent', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(process.env.NODE_ENV).not.toBe('production');
    expect(siteOrigin()).toBe('http://localhost:3000');
  });
});

describe('absoluteUrl', () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = original;
    }
  });

  it('builds the product URL used in the WhatsApp message', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://studio-marmer.dockhosting.dev';
    expect(absoluteUrl('/produk/vas-lampu-tidur')).toBe(
      'https://studio-marmer.dockhosting.dev/produk/vas-lampu-tidur'
    );
  });

  it('never emits a double slash, even from a trailing-slash origin', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://studio-marmer.dockhosting.dev/';
    expect(absoluteUrl('/produk/vas-lampu-tidur')).toBe(
      'https://studio-marmer.dockhosting.dev/produk/vas-lampu-tidur'
    );
  });

  it('adds the missing leading slash for a bare path', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://studio-marmer.dockhosting.dev';
    expect(absoluteUrl('produk/vas-lampu-tidur')).toBe(
      'https://studio-marmer.dockhosting.dev/produk/vas-lampu-tidur'
    );
  });

  it('never falls back to localhost in production', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    vi.stubEnv('NODE_ENV', 'production');
    // The helper warns once when the variable is missing in production; that is
    // intended behaviour, not something this assertion should print.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      expect(absoluteUrl('/produk/vas-lampu-tidur')).toBe(
        'https://studio-marmer.dockhosting.dev/produk/vas-lampu-tidur'
      );
    } finally {
      warn.mockRestore();
      vi.unstubAllEnvs();
    }
  });
});