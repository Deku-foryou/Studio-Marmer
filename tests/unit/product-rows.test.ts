import { describe, expect, it } from 'vitest';

import {
  findRowOverflow,
  overflowFieldErrors,
  MAX_PRODUCT_ROWS,
  SPECIFICATIONS_LIMIT_MESSAGE,
  IMAGES_LIMIT_MESSAGE,
} from '@/lib/validation/product-rows';

/**
 * Overflow detection.
 *
 * This is the half of the row-limit rule that the Zod `.max()` cannot do. The
 * FormData parser stops at index MAX-1, so an over-limit row is truncated before
 * validation runs and the schema would happily pass the truncated remainder.
 * These tests pin that the extra row is instead reported.
 */

/** Builds FormData with `count` populated indexed rows from index 0. */
function formDataWith(
  kind: 'spec' | 'image',
  count: number,
  startIndex = 0
): FormData {
  const fd = new FormData();
  for (let i = 0; i < count; i++) {
    const n = startIndex + i;
    if (kind === 'spec') {
      fd.set(`spec_${n}_label`, `Label ${n}`);
      fd.set(`spec_${n}_value`, `Nilai ${n}`);
    } else {
      fd.set(`image_${n}_url`, `https://res.cloudinary.com/demo/image/upload/v1/p${n}.png`);
      fd.set(`image_${n}_alt`, `Alt ${n}`);
      fd.set(`image_${n}_publicId`, `pid/${n}`);
    }
  }
  return fd;
}

describe('findRowOverflow', () => {
  describe('within the limit', () => {
    it(`reports nothing for exactly ${MAX_PRODUCT_ROWS} specification rows`, () => {
      const fd = formDataWith('spec', MAX_PRODUCT_ROWS);
      expect(findRowOverflow(fd.entries())).toEqual({
        specifications: false,
        images: false,
      });
    });

    it(`reports nothing for ${MAX_PRODUCT_ROWS - 1} specification rows`, () => {
      const fd = formDataWith('spec', MAX_PRODUCT_ROWS - 1);
      expect(findRowOverflow(fd.entries()).specifications).toBe(false);
    });

    it(`reports nothing for a single row`, () => {
      const fd = formDataWith('spec', 1);
      expect(findRowOverflow(fd.entries()).specifications).toBe(false);
    });

    it('reports nothing for an empty submission', () => {
      expect(findRowOverflow(new FormData().entries())).toEqual({
        specifications: false,
        images: false,
      });
    });
  });

  describe('beyond the limit', () => {
    it(`flags the ${MAX_PRODUCT_ROWS + 1}th specification row`, () => {
      // Exactly at the limit plus one row past it.
      const fd = formDataWith('spec', MAX_PRODUCT_ROWS + 1);
      const overflow = findRowOverflow(fd.entries());
      expect(overflow.specifications).toBe(true);
      expect(overflow.images).toBe(false);
    });

    it('flags a 27th specification row submitted on its own', () => {
      const fd = new FormData();
      fd.set('spec_27_label', 'Latarang 27');
      fd.set('spec_27_value', 'Nilai 27');
      expect(findRowOverflow(fd.entries()).specifications).toBe(true);
    });

    it(`flags the ${MAX_PRODUCT_ROWS + 1}th image row`, () => {
      const fd = formDataWith('image', MAX_PRODUCT_ROWS + 1);
      expect(findRowOverflow(fd.entries()).images).toBe(true);
    });

    it('flags both sections when both are over', () => {
      const fd = formDataWith('spec', MAX_PRODUCT_ROWS + 2);
      for (let i = 0; i < MAX_PRODUCT_ROWS + 2; i++) {
        fd.set(`image_${i}_url`, `https://res.cloudinary.com/demo/image/upload/v1/p${i}.png`);
      }
      expect(findRowOverflow(fd.entries())).toEqual({
        specifications: true,
        images: true,
      });
    });

    it('detects a far-out index without scanning every index up to it', () => {
      // The implementation iterates the submitted keys once. A naive
      // `for (let i = 0; ; i++)` scan would take far longer on a sparse key.
      const fd = new FormData();
      fd.set('spec_0_label', 'x');
      fd.set('spec_999999_label', 'far away');
      fd.set('spec_999999_value', 'far away');
      const started = Date.now();
      expect(findRowOverflow(fd.entries()).specifications).toBe(true);
      expect(Date.now() - started).toBeLessThan(1000);
    });
  });

  describe('blank rows never trigger a false error', () => {
    it('ignores empty trailing specification rows past the limit', () => {
      const fd = formDataWith('spec', MAX_PRODUCT_ROWS);
      for (let i = MAX_PRODUCT_ROWS; i < MAX_PRODUCT_ROWS + 5; i++) {
        fd.set(`spec_${i}_label`, '');
        fd.set(`spec_${i}_value`, '');
      }
      expect(findRowOverflow(fd.entries()).specifications).toBe(false);
    });

    it('ignores empty trailing image slots past the limit', () => {
      const fd = formDataWith('image', MAX_PRODUCT_ROWS);
      for (let i = MAX_PRODUCT_ROWS; i < MAX_PRODUCT_ROWS + 5; i++) {
        fd.set(`image_${i}_url`, '');
        fd.set(`image_${i}_alt`, '');
        fd.set(`image_${i}_publicId`, '');
      }
      expect(findRowOverflow(fd.entries()).images).toBe(false);
    });

    it('treats whitespace-only values as blank', () => {
      const fd = new FormData();
      fd.set('image_0_url', 'https://res.cloudinary.com/demo/image/upload/v1/a.png');
      fd.set('image_40_url', '   ');
      fd.set('image_41_url', '\t\n');
      fd.set('spec_30_label', '  ');
      fd.set('spec_30_value', '');
      const overflow = findRowOverflow(fd.entries());
      expect(overflow.images).toBe(false);
      expect(overflow.specifications).toBe(false);
    });

    it('does not count an image slot that has alt text but no URL', () => {
      // The parser drops url-less slots, so such a row would never be persisted
      // and must not be reported as an over-limit submission.
      const fd = new FormData();
      fd.set('image_0_url', 'https://res.cloudinary.com/demo/image/upload/v1/a.png');
      fd.set('image_30_alt', 'Alt tanpa URL');
      fd.set('image_30_publicId', 'pid/30');
      expect(findRowOverflow(fd.entries()).images).toBe(false);
    });
  });

  describe('unrelated keys are ignored', () => {
    it('ignores non-indexed and non-numeric keys', () => {
      const fd = new FormData();
      fd.set('name', 'Produk');
      fd.set('description', 'https://example.com/999');
      fd.set('spec_ab_label', 'x');
      fd.set('spec_ab_value', 'x');
      fd.set('imageCount', '999');
      fd.set('specification_note', 'x');
      expect(findRowOverflow(fd.entries())).toEqual({
        specifications: false,
        images: false,
      });
    });

    it('ignores a non-string FormData value (a File) at a valid key', () => {
      const fd = new FormData();
      fd.set('image_0_url', new File(['x'], 'a.png', { type: 'image/png' }));
      expect(findRowOverflow(fd.entries()).images).toBe(false);
    });
  });

  it('is deterministic: the same input always yields the same result', () => {
    const build = () => {
      const fd = formDataWith('spec', MAX_PRODUCT_ROWS + 1);
      return findRowOverflow(fd.entries());
    };
    const first = build();
    for (let i = 0; i < 5; i++) {
      expect(build()).toEqual(first);
    }
  });
});

describe('overflowFieldErrors', () => {
  it('returns nothing when neither section overflowed', () => {
    expect(
      overflowFieldErrors({ specifications: false, images: false })
    ).toEqual({});
  });

  it('keys the specifications error to the field the form reads', () => {
    const errors = overflowFieldErrors({ specifications: true, images: false });
    expect(errors).toEqual({ specifications: SPECIFICATIONS_LIMIT_MESSAGE });
    // ProductForm renders exactly this key via <FieldError>.
    expect(Object.keys(errors)).toContain('specifications');
  });

  it('keys the images error to the field the form reads', () => {
    expect(overflowFieldErrors({ specifications: false, images: true })).toEqual({
      images: IMAGES_LIMIT_MESSAGE,
    });
  });

  it('reports both fields when both overflowed', () => {
    expect(
      Object.keys(overflowFieldErrors({ specifications: true, images: true })).sort()
    ).toEqual(['images', 'specifications']);
  });

  it('states the actual limit in both messages', () => {
    const errors = overflowFieldErrors({ specifications: true, images: true });
    expect(errors.specifications).toContain(String(MAX_PRODUCT_ROWS));
    expect(errors.images).toContain(String(MAX_PRODUCT_ROWS));
  });
});

describe('MAX_PRODUCT_ROWS', () => {
  it('is the documented limit of 26', () => {
    expect(MAX_PRODUCT_ROWS).toBe(26);
  });
});
