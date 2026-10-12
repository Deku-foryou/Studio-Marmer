import { describe, expect, it } from 'vitest';

import {
  createProductSchema,
  updateProductSchema,
  specificationsToJson,
  productImageInputSchema,
  productSpecificationInputSchema,
  MAX_PRODUCT_ROWS,
} from '@/lib/validation/product';
import {
  findRowOverflow,
  overflowFieldErrors,
} from '@/lib/validation/product-rows';

/**
 * Product validation.
 *
 * Numeric fields arrive from `<input type="number">` as strings, so every
 * numeric case here passes a string and asserts on the coerced output — testing
 * the coercion the real form actually relies on rather than a convenient number.
 */

/** A valid product, as the form would submit it (all numeric fields as strings). */
function product(over: Record<string, unknown> = {}) {
  return {
    name: 'Tempat Tisu Marmer Carrara',
    categoryId: '1',
    shortDescription: 'Tempat tisu marble solid.',
    description: 'Deskripsi produk yang cukup panjang.',
    pricingType: 'FIXED',
    price: '185000',
    stoneType: 'Carrara',
    color: 'Putih abu-abu',
    dimensions: '15 x 12 x 11 cm',
    weightGrams: '2400',
    images: [{ imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/a.png' }],
    ...over,
  };
}

const spec = (i: number) => ({ label: `Label ${i}`, value: `Nilai ${i}` });
const image = (i: number) => ({
  imageUrl: `https://res.cloudinary.com/demo/image/upload/v1/p${i}.png`,
  altText: `Alt ${i}`,
});

describe('createProductSchema — valid data', () => {
  it('accepts a complete product', () => {
    const result = createProductSchema.safeParse(product());
    expect(result.success).toBe(true);
  });

  it('coerces numeric strings to numbers', () => {
    const result = createProductSchema.safeParse(product());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(185000);
      expect(result.data.weightGrams).toBe(2400);
      expect(result.data.categoryId).toBe(1);
    }
  });

  it('accepts the STARTING_FROM pricing type', () => {
    expect(createProductSchema.safeParse(product({ pricingType: 'STARTING_FROM' })).success).toBe(
      true
    );
  });

  it('trims surrounding whitespace from text fields', () => {
    const result = createProductSchema.safeParse(product({ name: '  Tempat Tisu  ' }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('Tempat Tisu');
  });

  it('accepts a STARTING_FROM product with no originalPrice', () => {
    const result = createProductSchema.safeParse(product({ originalPrice: '' }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.originalPrice).toBeUndefined();
  });

  it('accepts a valid root-relative image path', () => {
    const result = createProductSchema.safeParse(
      product({ images: [{ imageUrl: '/images/local.webp' }] })
    );
    expect(result.success).toBe(true);
  });
});

describe('createProductSchema — required fields', () => {
  const requiredCases: Array<[string, Record<string, unknown>]> = [
    ['name', { name: '' }],
    ['name (whitespace only)', { name: '   ' }],
    ['categoryId', { categoryId: '' }],
    ['shortDescription', { shortDescription: '' }],
    ['description', { description: '' }],
    ['pricingType', { pricingType: 'UNKNOWN' }],
    ['price', { price: '' }],
    ['stoneType', { stoneType: '' }],
    ['color', { color: '' }],
    ['dimensions', { dimensions: '' }],
    ['weightGrams', { weightGrams: '' }],
  ];

  for (const [label, over] of requiredCases) {
    it(`rejects a missing ${label}`, () => {
      expect(createProductSchema.safeParse(product(over)).success).toBe(false);
    });
  }

  it('rejects an entirely empty payload', () => {
    expect(createProductSchema.safeParse({}).success).toBe(false);
  });

  it('requires at least one image', () => {
    expect(createProductSchema.safeParse(product({ images: [] })).success).toBe(false);
    expect(createProductSchema.safeParse(product({ images: undefined })).success).toBe(false);
  });

  it('rejects an over-long name', () => {
    expect(createProductSchema.safeParse(product({ name: 'a'.repeat(201) })).success).toBe(false);
  });

  it('rejects an over-long description', () => {
    expect(
      createProductSchema.safeParse(product({ description: 'a'.repeat(20001) })).success
    ).toBe(false);
  });
});

describe('createProductSchema — numeric rules', () => {
  it('rejects a non-numeric price', () => {
    expect(createProductSchema.safeParse(product({ price: 'abc' })).success).toBe(false);
    expect(createProductSchema.safeParse(product({ price: '185rb' })).success).toBe(false);
  });

  it('rejects a zero or negative price', () => {
    expect(createProductSchema.safeParse(product({ price: '0' })).success).toBe(false);
    expect(createProductSchema.safeParse(product({ price: '-1' })).success).toBe(false);
  });

  it('rejects a fractional weight', () => {
    expect(createProductSchema.safeParse(product({ weightGrams: '2400.5' })).success).toBe(false);
  });

  it('rejects a zero or negative weight', () => {
    expect(createProductSchema.safeParse(product({ weightGrams: '0' })).success).toBe(false);
    expect(createProductSchema.safeParse(product({ weightGrams: '-5' })).success).toBe(false);
  });

  it('rejects a non-integer or non-positive categoryId', () => {
    expect(createProductSchema.safeParse(product({ categoryId: '1.5' })).success).toBe(false);
    expect(createProductSchema.safeParse(product({ categoryId: '0' })).success).toBe(false);
    expect(createProductSchema.safeParse(product({ categoryId: '-3' })).success).toBe(false);
  });

  it('rejects a blank originalPrice that is not "absent"', () => {
    // A blank string becomes undefined (allowed); garbage does not.
    expect(createProductSchema.safeParse(product({ originalPrice: 'abc' })).success).toBe(false);
  });

  it('rejects an originalPrice that is not greater than the price', () => {
    // Mirrors the database CHECK constraint.
    expect(createProductSchema.safeParse(product({ originalPrice: '100' })).success).toBe(false);
    expect(createProductSchema.safeParse(product({ originalPrice: '185000' })).success).toBe(false);
  });

  it('accepts an originalPrice strictly greater than the price', () => {
    const result = createProductSchema.safeParse(product({ originalPrice: '200000' }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.originalPrice).toBe(200000);
  });

  it('reports the pricing cross-field error against originalPrice', () => {
    const result = createProductSchema.safeParse(product({ originalPrice: '100' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'originalPrice')).toBe(true);
    }
  });
});

describe('createProductSchema — optional fields and defaults', () => {
  it('defaults every business flag when absent', () => {
    const result = createProductSchema.safeParse(product());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isAvailable).toBe(true);
      expect(result.data.isUniquePiece).toBe(false);
      expect(result.data.isFeatured).toBe(false);
      expect(result.data.whatsappEnabled).toBe(true);
    }
  });

  it('honours explicitly submitted flags', () => {
    // Real booleans, because that is what readFormData produces:
    // `formData.get('isAvailable') === 'on'` yields true/false, never the string
    // "on" or "false". Coercing the STRING "false" would be meaningless here
    // (Boolean("false") is true) and asserting it would encode a behaviour the
    // application never exercises.
    const result = createProductSchema.safeParse(
      product({
        isAvailable: false,
        isUniquePiece: true,
        isFeatured: true,
        whatsappEnabled: false,
      })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isAvailable).toBe(false);
      expect(result.data.isUniquePiece).toBe(true);
      expect(result.data.isFeatured).toBe(true);
      expect(result.data.whatsappEnabled).toBe(false);
    }
  });

  it('treats blank optional text as absent', () => {
    const result = createProductSchema.safeParse(
      product({ material: '   ', craftingTime: '', shopeeUrl: '  ' })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.material).toBeUndefined();
      expect(result.data.craftingTime).toBeUndefined();
      expect(result.data.shopeeUrl).toBeUndefined();
    }
  });

  it('accepts a valid https shopeeUrl and rejects a javascript: one', () => {
    expect(
      createProductSchema.safeParse(product({ shopeeUrl: 'https://shopee.co.id/a' })).success
    ).toBe(true);
    expect(
      createProductSchema.safeParse(product({ shopeeUrl: 'javascript:alert(1)' })).success
    ).toBe(false);
    expect(createProductSchema.safeParse(product({ shopeeUrl: 'http://' })).success).toBe(false);
  });
});

describe('createProductSchema — row limits', () => {
  for (const n of [0, 1, 25, MAX_PRODUCT_ROWS]) {
    it(`accepts ${n} specification rows`, () => {
      const result = createProductSchema.safeParse(
        product({ specifications: Array.from({ length: n }, (_, i) => spec(i)) })
      );
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.specifications).toHaveLength(n);
    });
  }

  it(`rejects ${MAX_PRODUCT_ROWS + 1} specification rows`, () => {
    const result = createProductSchema.safeParse(
      product({ specifications: Array.from({ length: MAX_PRODUCT_ROWS + 1 }, (_, i) => spec(i)) })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.specifications?.[0]).toContain(
        `Maksimal ${MAX_PRODUCT_ROWS}`
      );
    }
  });

  for (const n of [1, 25, MAX_PRODUCT_ROWS]) {
    it(`accepts ${n} image rows`, () => {
      const result = createProductSchema.safeParse(
        product({ images: Array.from({ length: n }, (_, i) => image(i)) })
      );
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.images).toHaveLength(n);
    });
  }

  it(`rejects ${MAX_PRODUCT_ROWS + 1} image rows`, () => {
    const result = createProductSchema.safeParse(
      product({ images: Array.from({ length: MAX_PRODUCT_ROWS + 1 }, (_, i) => image(i)) })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.images?.[0]).toContain(`Maksimal ${MAX_PRODUCT_ROWS}`);
    }
  });

  it('rejects a malformed image URL inside the array', () => {
    expect(
      createProductSchema.safeParse(product({ images: [{ imageUrl: 'javascript:alert(1)' }] })).success
    ).toBe(false);
    expect(
      createProductSchema.safeParse(product({ images: [{ imageUrl: 'http://' }] })).success
    ).toBe(false);
  });

  it('rejects an over-long specification label', () => {
    expect(
      createProductSchema.safeParse(
        product({ specifications: [{ label: 'a'.repeat(121), value: 'v' }] })
      ).success
    ).toBe(false);
  });

  it('rejects a specification row missing its value', () => {
    expect(
      createProductSchema.safeParse(product({ specifications: [{ label: 'L', value: '' }] })).success
    ).toBe(false);
  });
});

describe('create and update schemas agree', () => {
  // They are built from one shared shape; this pins that they cannot drift.
  const cases: Array<[string, Record<string, unknown>]> = [
    ['valid product', {}],
    ['missing name', { name: '' }],
    ['bad price', { price: 'abc' }],
    ['zero images', { images: [] }],
    ['originalPrice below price', { originalPrice: '1' }],
    ['too many specs', { specifications: Array.from({ length: 30 }, (_, i) => spec(i)) }],
  ];

  for (const [label, over] of cases) {
    it(`${label}: create and update produce the same verdict`, () => {
      expect(createProductSchema.safeParse(product(over)).success).toBe(
        updateProductSchema.safeParse(product(over)).success
      );
    });
  }

  it('both enforce the same row ceiling', () => {
    const over = product({ specifications: Array.from({ length: MAX_PRODUCT_ROWS + 1 }, (_, i) => spec(i)) });
    expect(createProductSchema.safeParse(over).success).toBe(false);
    expect(updateProductSchema.safeParse(over).success).toBe(false);
  });

  it('both produce the same messages for an over-limit submission', () => {
    const over = product({ images: Array.from({ length: MAX_PRODUCT_ROWS + 1 }, (_, i) => image(i)) });
    const a = createProductSchema.safeParse(over);
    const b = updateProductSchema.safeParse(over);
    expect(a.success).toBe(false);
    expect(b.success).toBe(false);
    if (!a.success && !b.success) {
      expect(a.error.flatten().fieldErrors.images?.[0]).toBe(
        b.error.flatten().fieldErrors.images?.[0]
      );
    }
  });
});

describe('the schema limit alone cannot catch a truncated submission', () => {
  // The reason findRowOverflow exists. readFormData stops at index MAX-1, so Zod
  // is handed exactly MAX rows and passes; only the overflow helper sees the
  // 27th. This test documents the gap rather than asserting a fix in the wrong
  // layer.
  it('passes MAX rows while the raw submission carried more', () => {
    const fd = new FormData();
    for (let i = 0; i <= MAX_PRODUCT_ROWS; i++) {
      fd.set(`spec_${i}_label`, `Label ${i}`);
      fd.set(`spec_${i}_value`, `Nilai ${i}`);
    }
    // What the parser would hand the schema after truncating to the limit.
    const truncated = Array.from({ length: MAX_PRODUCT_ROWS }, (_, i) => spec(i));
    expect(createProductSchema.safeParse(product({ specifications: truncated })).success).toBe(true);

    // The overflow helper is what rejects it.
    expect(findRowOverflow(fd.entries()).specifications).toBe(true);
    expect(overflowFieldErrors(findRowOverflow(fd.entries())).specifications).toBeTruthy();
  });
});

describe('productImageInputSchema', () => {
  it('requires a non-empty URL', () => {
    expect(productImageInputSchema.safeParse({ imageUrl: '' }).success).toBe(false);
    expect(productImageInputSchema.safeParse({ imageUrl: '   ' }).success).toBe(false);
  });

  it('accepts a Cloudinary secure_url', () => {
    expect(
      productImageInputSchema.safeParse({
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/a.png',
      }).success
    ).toBe(true);
  });

  it('rejects a malformed publicId', () => {
    expect(
      productImageInputSchema.safeParse({
        imageUrl: '/images/a.webp',
        publicId: 'has spaces',
      }).success
    ).toBe(false);
  });

  it('treats a blank publicId as absent', () => {
    const result = productImageInputSchema.safeParse({
      imageUrl: '/images/a.webp',
      publicId: '   ',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.publicId).toBeUndefined();
  });
});

describe('productSpecificationInputSchema', () => {
  it('requires both halves', () => {
    expect(productSpecificationInputSchema.safeParse({ label: '', value: '' }).success).toBe(false);
    expect(productSpecificationInputSchema.safeParse({ label: 'L', value: '' }).success).toBe(false);
    expect(productSpecificationInputSchema.safeParse({ label: '', value: 'V' }).success).toBe(false);
  });

  it('trims both halves', () => {
    const result = productSpecificationInputSchema.safeParse({ label: ' L ', value: ' V ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.label).toBe('L');
      expect(result.data.value).toBe('V');
    }
  });
});

describe('specificationsToJson', () => {
  it('drops rows missing either half', () => {
    expect(
      specificationsToJson([
        { label: 'L', value: 'V' },
        { label: '', value: 'V' },
        { label: 'L', value: '' },
      ])
    ).toEqual([{ label: 'L', value: 'V' }]);
  });

  it('returns undefined when every row is blank', () => {
    expect(specificationsToJson([])).toBeUndefined();
    expect(specificationsToJson([{ label: '  ', value: '  ' }])).toBeUndefined();
  });

  it('trims stored values', () => {
    expect(specificationsToJson([{ label: ' L ', value: ' V ' }])).toEqual([
      { label: 'L', value: 'V' },
    ]);
  });
});
