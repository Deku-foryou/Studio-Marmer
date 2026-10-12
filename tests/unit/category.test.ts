import { describe, expect, it } from 'vitest';

import {
  createCategorySchema,
  updateCategorySchema,
  toCategoryImageColumns,
} from '@/lib/validation/category';
import {
  createGalleryItemSchema,
  updateGalleryItemSchema,
  toGalleryImageColumns,
} from '@/lib/validation/gallery';
import {
  siteSettingsSchema,
  toSiteMediaColumns,
} from '@/lib/validation/site-settings';

/**
 * Category, gallery and site-media URL validation.
 *
 * The category validator used to be `/^https?:\/\//i.test(val) || val.startsWith('/')`,
 * which accepted a bare `http://` and any protocol-relative URL. These cases
 * exercise the real schema, so the fix is what is being verified.
 */

/** The URL policy every media field in the admin shares. */
const URL_CASES: Array<[string, string, boolean]> = [
  ['a valid https Cloudinary URL', 'https://res.cloudinary.com/demo/image/upload/v1/a.png', true],
  ['a valid http URL', 'http://example.com/a.png', true],
  ['a valid root-relative path', '/images/hero-marble-vanity-1672.webp', true],
  ['a nested root-relative path', '/images/nested/deep.webp', true],
  ['the real seeded Cloudinary URL', 'https://res.cloudinary.com/std3x7lf/image/upload/v1791528840/studio-marmer/products/r6dsvrbqlkxor1kl7glq.png', true],
  // The original finding.
  ['a bare http:// with no host', 'http://', false],
  ['a bare https:// with no host', 'https://', false],
  // Starts with '/' but resolves against the page scheme.
  ['a protocol-relative URL', '//example.com/a.png', false],
  ['a protocol-relative bare host', '//example.com', false],
  // Other protocols.
  ['a javascript: URL', 'javascript:alert(1)', false],
  ['a mixed-case javascript: URL', 'JavaScript:alert(1)', false],
  ['a data: URL', 'data:image/png;base64,AAAA', false],
  ['an ftp: URL', 'ftp://example.com/a.png', false],
  ['a file: URL', 'file:///etc/passwd', false],
  ['plain text', 'nonsense', false],
];

describe('createCategorySchema.imageUrl', () => {
  for (const [label, value, expected] of URL_CASES) {
    it(`${expected ? 'accepts' : 'rejects'} ${label}`, () => {
      const result = createCategorySchema.safeParse({
        name: 'Kategori Uji',
        imageUrl: value,
      });
      expect(result.success).toBe(expected);
    });
  }

  it('trims surrounding whitespace before validating', () => {
    const result = createCategorySchema.safeParse({
      name: 'Kategori Uji',
      imageUrl: '  https://example.com/a.png  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.imageUrl).toBe('https://example.com/a.png');
    }
  });
});

describe('updateCategorySchema.imageUrl', () => {
  for (const [label, value, expected] of URL_CASES) {
    it(`${expected ? 'accepts' : 'rejects'} ${label}`, () => {
      const result = updateCategorySchema.safeParse({
        name: 'Kategori Uji',
        imageUrl: value,
        isActive: true,
      });
      expect(result.success).toBe(expected);
    });
  }
});

describe('category required fields and optional defaults', () => {
  it('rejects an empty name', () => {
    expect(createCategorySchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('rejects a name longer than 100 characters', () => {
    expect(createCategorySchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false);
    expect(createCategorySchema.safeParse({ name: 'a'.repeat(100) }).success).toBe(true);
  });

  it('rejects a name longer than 100 characters on update too', () => {
    expect(
      updateCategorySchema.safeParse({ name: 'a'.repeat(101), isActive: true }).success
    ).toBe(false);
  });

  it('treats a blank imageUrl as absent rather than invalid', () => {
    const result = createCategorySchema.safeParse({ name: 'Marmer', imageUrl: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.imageUrl).toBeUndefined();
  });

  it('treats a blank description as absent', () => {
    const result = createCategorySchema.safeParse({ name: 'Marmer', description: '  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeUndefined();
  });

  it('allows an omitted imageUrl entirely', () => {
    expect(createCategorySchema.safeParse({ name: 'Marmer' }).success).toBe(true);
  });

  it('rejects an imageUrl longer than 500 characters', () => {
    const long = `https://example.com/${'a'.repeat(495)}`;
    expect(createCategorySchema.safeParse({ name: 'X', imageUrl: long }).success).toBe(false);
  });

  it('rejects a malformed publicId', () => {
    expect(
      createCategorySchema.safeParse({ name: 'X', publicId: 'has spaces' }).success
    ).toBe(false);
    expect(
      createCategorySchema.safeParse({ name: 'X', publicId: '/leading-slash' }).success
    ).toBe(false);
    expect(
      createCategorySchema.safeParse({ name: 'X', publicId: 'studio-marmer/products/a1' }).success
    ).toBe(true);
  });

  it('accepts a non-negative integer sortOrder and rejects a negative one', () => {
    expect(createCategorySchema.safeParse({ name: 'X', sortOrder: '3' }).success).toBe(true);
    expect(createCategorySchema.safeParse({ name: 'X', sortOrder: '-1' }).success).toBe(false);
  });
});

describe('URL policy divergence between validators (known gap)', () => {
  /*
   * A single, explicit statement of where the admin media validators disagree.
   * Category uses the shared helper; gallery and site-settings still use the
   * older `startsWith('/')` branch. All three reject a bare `http://` and
   * `javascript:`, but only category rejects a protocol-relative URL.
   *
   * This test is the one to delete when gallery.ts and site-settings.ts are
   * migrated to `isAllowedMediaUrl`.
   */
  const protocolRelative = '//example.com/a.png';

  it('category rejects a protocol-relative URL', () => {
    expect(
      createCategorySchema.safeParse({ name: 'X', imageUrl: protocolRelative }).success
    ).toBe(false);
  });

  it('gallery currently accepts one (expected to change)', () => {
    expect(
      createGalleryItemSchema.safeParse({ title: 'T', imageUrl: protocolRelative, isActive: true })
        .success
    ).toBe(true);
  });

  it('site settings currently accepts one (expected to change)', () => {
    expect(
      siteSettingsSchema.safeParse({ siteName: 'S', heroImageUrl: protocolRelative }).success
    ).toBe(true);
  });

  it('all three agree on the cases that matter most', () => {
    const bare = ['http://', 'https://', 'javascript:alert(1)', 'data:image/png;base64,AAAA'];
    for (const value of bare) {
      expect(
        createCategorySchema.safeParse({ name: 'X', imageUrl: value }).success,
        `category / ${value}`
      ).toBe(false);
      expect(
        createGalleryItemSchema.safeParse({ title: 'T', imageUrl: value, isActive: true }).success,
        `gallery / ${value}`
      ).toBe(false);
      expect(
        siteSettingsSchema.safeParse({ siteName: 'S', heroImageUrl: value }).success,
        `site settings / ${value}`
      ).toBe(false);
    }
  });
});

describe('toCategoryImageColumns', () => {
  it('maps both columns to null when there is no image', () => {
    expect(toCategoryImageColumns({})).toEqual({ imageUrl: null, publicId: null });
  });

  it('keeps a URL that has no public id', () => {
    expect(toCategoryImageColumns({ imageUrl: '/images/a.webp' })).toEqual({
      imageUrl: '/images/a.webp',
      publicId: null,
    });
  });

  it('keeps the URL and public id together', () => {
    expect(
      toCategoryImageColumns({ imageUrl: 'https://x.test/a.png', publicId: 'p/a' })
    ).toEqual({ imageUrl: 'https://x.test/a.png', publicId: 'p/a' });
  });

  it('turns an explicitly undefined value into null', () => {
    expect(
      toCategoryImageColumns({ imageUrl: undefined, publicId: undefined })
    ).toEqual({ imageUrl: null, publicId: null });
  });
});

describe('gallery media URL policy', () => {
  /*
   * KNOWN GAP - gallery.ts and site-settings.ts have NOT been migrated to the
   * shared `isAllowedMediaUrl` helper, so they still use the older
   * `value.startsWith('/')` branch. That branch accepts a protocol-relative URL
   * (`//example.com/a.png`), which the browser resolves against whatever scheme
   * the page was served with - the exact weakness fixed for categories in
   * Phase 3.
   *
   * These cases assert the CURRENT behaviour so the divergence is visible and
   * cannot be mistaken for intended policy. They are expected to fail once
   * gallery.ts is migrated to the shared helper - at which point the `expected`
   * values below should flip to `false`. Nothing else in this file asserts a
   * protocol-relative URL is acceptable for a category.
   */
  const GALLERY_URL_CASES: Array<[string, string, boolean]> = [
    ['a valid https Cloudinary URL', 'https://res.cloudinary.com/demo/image/upload/v1/a.png', true],
    ['a valid http URL', 'http://example.com/a.png', true],
    ['a valid root-relative path', '/images/hero.webp', true],
    ['a bare http:// with no host', 'http://', false],
    ['a javascript: URL', 'javascript:alert(1)', false],
    ['a data: URL', 'data:image/png;base64,AAAA', false],
    // Currently ACCEPTED — divergence from the category policy, see note above.
    ['a protocol-relative URL', '//example.com/a.png', true],
    ['a protocol-relative bare host', '//example.com', true],
  ];

  it('requires a non-empty imageUrl', () => {
    expect(
      createGalleryItemSchema.safeParse({ title: 'Foto', imageUrl: '', isActive: true }).success
    ).toBe(false);
    expect(
      createGalleryItemSchema.safeParse({ title: 'Foto', isActive: true }).success
    ).toBe(false);
  });

  for (const [label, value, expected] of GALLERY_URL_CASES) {
    it(`${expected ? 'accepts' : 'rejects'} ${label}`, () => {
      const result = createGalleryItemSchema.safeParse({
        title: 'Foto',
        imageUrl: value,
        isActive: true,
      });
      expect(result.success).toBe(expected);
    });
  }

  it('rejects a URL containing characters that could break out of url()', () => {
    expect(
      createGalleryItemSchema.safeParse({
        title: 'Foto',
        imageUrl: 'https://example.com/a".png',
        isActive: true,
      }).success
    ).toBe(false);
    expect(
      createGalleryItemSchema.safeParse({
        title: 'Foto',
        imageUrl: 'https://example.com/a b.png',
        isActive: true,
      }).success
    ).toBe(false);
  });

  it('applies the same rules on update', () => {
    expect(
      updateGalleryItemSchema.safeParse({ title: 'Foto', imageUrl: 'https://example.com/a".png', isActive: true })
        .success
    ).toBe(false);
    expect(
      updateGalleryItemSchema.safeParse({ title: 'Foto', imageUrl: '/images/a.webp', isActive: true })
        .success
    ).toBe(true);
  });

  it('drops a public id that has no URL', () => {
    expect(toGalleryImageColumns({ imageUrl: '/images/a.webp', publicId: 'p/a' })).toEqual({
      imageUrl: '/images/a.webp',
      publicId: 'p/a',
    });
  });
});

describe('site settings media URL policy', () => {
  /*
   * `siteName` is required by the schema, so every case supplies it.
   *
   * SAME KNOWN GAP as gallery above: site-settings.ts keeps the older
   * `startsWith('/')` branch and therefore still accepts a protocol-relative
   * URL. The hero image is rendered into a CSS `url()`, so this is the more
   * consequential of the two.
   */
  const base = { siteName: 'Studio Marmer' };

  it('requires siteName', () => {
    expect(siteSettingsSchema.safeParse({}).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ siteName: '   ' }).success).toBe(false);
  });

  it('accepts a valid Cloudinary URL', () => {
    const result = siteSettingsSchema.safeParse({
      ...base,
      heroImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/a.png',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a root-relative path', () => {
    const result = siteSettingsSchema.safeParse({ ...base, heroImageUrl: '/images/hero.webp' });
    expect(result.success).toBe(true);
  });

  it('rejects a bare scheme with no host', () => {
    expect(siteSettingsSchema.safeParse({ ...base, heroImageUrl: 'http://' }).success).toBe(false);
  });

  it('rejects a javascript: URL', () => {
    expect(
      siteSettingsSchema.safeParse({ ...base, heroImageUrl: 'javascript:alert(1)' }).success
    ).toBe(false);
  });

  it('rejects a URL with quote characters', () => {
    expect(
      siteSettingsSchema.safeParse({ ...base, heroImageUrl: 'https://example.com/a".png' }).success
    ).toBe(false);
  });

  it('currently ACCEPTS a protocol-relative URL (divergence from category policy)', () => {
    // Encodes present behaviour so the gap is explicit. Flip to false once
    // site-settings.ts adopts the shared helper.
    expect(
      siteSettingsSchema.safeParse({ ...base, heroImageUrl: '//evil.test/a.png' }).success
    ).toBe(true);
  });

  it('maps absent media columns to null', () => {
    expect(toSiteMediaColumns({})).toEqual({ url: null, publicId: null });
  });

  it('keeps a URL with no public id', () => {
    expect(toSiteMediaColumns({ url: '/images/hero.webp' })).toEqual({
      url: '/images/hero.webp',
      publicId: null,
    });
  });

  it('drops a public id that has no URL', () => {
    expect(toSiteMediaColumns({ publicId: 'p/a' })).toEqual({
      url: null,
      publicId: null,
    });
  });
});
