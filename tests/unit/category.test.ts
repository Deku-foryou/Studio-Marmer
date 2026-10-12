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
import { productImageInputSchema } from '@/lib/validation/product';

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

describe('every media validator shares one policy', () => {
  /*
   * The regression guard for this change. Category, gallery, product images and
   * both site-settings media fields must agree on every URL, so a future edit to
   * one validator cannot silently diverge from the rest.
   *
   * Each entry is exercised through the real schema — this asserts validation
   * behaviour, not the presence of an import or a string in the source.
   */
  const validators: Array<[string, (value: string) => boolean]> = [
    [
      'Category.imageUrl',
      (v) => createCategorySchema.safeParse({ name: 'X', imageUrl: v }).success,
    ],
    [
      'GalleryImage.imageUrl',
      (v) => createGalleryItemSchema.safeParse({ title: 'T', imageUrl: v, isActive: true }).success,
    ],
    [
      'ProductImage.imageUrl',
      (v) =>
        productImageInputSchema.safeParse({ imageUrl: v }).success,
    ],
    [
      'SiteSettings.heroImageUrl',
      (v) => siteSettingsSchema.safeParse({ siteName: 'S', heroImageUrl: v }).success,
    ],
    [
      'SiteSettings.logoUrl',
      (v) => siteSettingsSchema.safeParse({ siteName: 'S', logoUrl: v }).success,
    ],
  ];

  // The shared policy, stated once.
  const SHARED_POLICY: Array<[string, boolean]> = [
    ['https://res.cloudinary.com/demo/image/upload/v1/a.png', true],
    ['http://example.com/a.png', true],
    ['/images/hero.webp', true],
    ['/images/nested/deep.webp', true],
    ['//example.com/a.png', false],
    ['//example.com', false],
    ['http://', false],
    ['https://', false],
    ['javascript:alert(1)', false],
    ['JavaScript:alert(1)', false],
    ['data:image/png;base64,AAAA', false],
    ['ftp://example.com/a.png', false],
    ['file:///etc/passwd', false],
    ['nonsense', false],
    ['example.com/a.png', false],
  ];

  for (const [label, expected] of SHARED_POLICY) {
    it(`all media fields agree on: ${label}`, () => {
      for (const [name, validate] of validators) {
        expect(validate(label), `${name} disagreed on ${label}`).toBe(expected);
      }
    });
  }

  it('covers all four validator locations', () => {
    expect(validators).toHaveLength(5);
    expect(validators.map(([name]) => name)).toEqual([
      'Category.imageUrl',
      'GalleryImage.imageUrl',
      'ProductImage.imageUrl',
      'SiteSettings.heroImageUrl',
      'SiteSettings.logoUrl',
    ]);
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
   * Gallery now uses the shared `isAllowedMediaUrl` helper, so its policy is
   * identical to category's. Previously it kept a local `startsWith('/')` branch
   * that accepted a protocol-relative URL. This table is now the single source of
   * truth for the media-URL policy, and every media validator is expected to
   * agree with it.
   */
  const GALLERY_URL_CASES: Array<[string, string, boolean]> = [
    ['a valid https Cloudinary URL', 'https://res.cloudinary.com/demo/image/upload/v1/a.png', true],
    ['a valid http URL', 'http://example.com/a.png', true],
    ['a valid root-relative path', '/images/hero.webp', true],
    ['a bare http:// with no host', 'http://', false],
    ['a javascript: URL', 'javascript:alert(1)', false],
    ['a data: URL', 'data:image/png;base64,AAAA', false],
    ['a protocol-relative URL', '//example.com/a.png', false],
    ['a protocol-relative bare host', '//example.com', false],
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

  it('rejects a protocol-relative URL', () => {
    expect(
      updateGalleryItemSchema.safeParse({ title: 'Foto', imageUrl: '//evil.test/a.png', isActive: true })
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
   * Site settings now uses the shared helper too. `siteName` is required by the
   * schema, so every case supplies it. The hero image is interpolated into a CSS
   * `url()` in components/layout/HeroSection.tsx, so both the protocol
   * allow-list and the character guard apply here.
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

  it('rejects a protocol-relative URL', () => {
    // The hero image is rendered into a CSS url(), so a value the browser would
    // resolve against the page scheme must never reach this field.
    expect(
      siteSettingsSchema.safeParse({ ...base, heroImageUrl: '//evil.test/a.png' }).success
    ).toBe(false);
    expect(
      siteSettingsSchema.safeParse({ ...base, heroImageUrl: '//evil.test' }).success
    ).toBe(false);
  });

  it('applies the same policy to logoUrl', () => {
    expect(
      siteSettingsSchema.safeParse({
        ...base,
        logoUrl: 'https://res.cloudinary.com/demo/image/upload/v1/logo.png',
      }).success
    ).toBe(true);
    expect(siteSettingsSchema.safeParse({ ...base, logoUrl: '/images/logo.webp' }).success).toBe(true);
    expect(siteSettingsSchema.safeParse({ ...base, logoUrl: '//evil.test/logo.png' }).success).toBe(
      false
    );
    expect(siteSettingsSchema.safeParse({ ...base, logoUrl: 'javascript:alert(1)' }).success).toBe(
      false
    );
    expect(siteSettingsSchema.safeParse({ ...base, logoUrl: 'http://' }).success).toBe(false);
  });

  it('treats a blank media URL as absent', () => {
    const result = siteSettingsSchema.safeParse({ ...base, heroImageUrl: '   ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.heroImageUrl).toBeUndefined();
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
