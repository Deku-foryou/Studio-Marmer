import { z } from 'zod';

/**
 * Server-side validation for product create/update.
 *
 * These schemas are the single source of truth for what a product may contain.
 * They run inside server actions only - the admin form's HTML attributes are a
 * usability aid and never a substitute for this.
 *
 * All user-facing messages are in Indonesian, matching the admin UI.
 */

/** Trimmed string, or `undefined` when the admin left the field blank. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter.`)
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional();

/**
 * Optional positive number from a text field.
 *
 * `z.coerce.number()` turns an empty string into `0`, which would fail the
 * positivity check and make "leave this field blank" impossible. The preprocess
 * step maps blank input to `undefined` first, so an empty field genuinely means
 * "not provided".
 */
const optionalPositiveNumber = (message: string) =>
  z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.coerce.number({ message }).positive(message).optional()
  );

/**
 * An image reference. Phase 6B-1 manages image *URLs* only - binary upload
 * arrives in Phase 6C. Both absolute http(s) URLs and site-relative paths
 * (`/placeholders/...`) are accepted, matching how products are seeded today.
 */
const imageUrlSchema = z
  .string()
  .trim()
  .min(1, 'URL foto wajib diisi.')
  .refine((value) => {
    if (value.startsWith('/')) return true;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'URL foto tidak valid. Gunakan tautan http(s) atau path yang diawali /.');

export const productImageInputSchema = z.object({
  imageUrl: imageUrlSchema,
  altText: optionalText(255),
});

/** A single Label | Value specification row. */
export const productSpecificationInputSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Label spesifikasi wajib diisi.')
    .max(120, 'Maksimal 120 karakter.'),
  value: z
    .string()
    .trim()
    .min(1, 'Nilai spesifikasi wajib diisi.')
    .max(255, 'Maksimal 255 karakter.'),
});

/**
 * Base shape shared by create and update.
 *
 * Numeric fields arrive from `<input type="number">` as strings, so they are
 * coerced. Empty optional numeric fields become `undefined` rather than `NaN`.
 */
const productBaseShape = {
  name: z
    .string()
    .trim()
    .min(1, 'Nama produk wajib diisi.')
    .max(200, 'Nama produk maksimal 200 karakter.'),

  categoryId: z.coerce
    .number({ message: 'Kategori wajib dipilih.' })
    .int('Kategori tidak valid.')
    .positive('Kategori wajib dipilih.'),

  shortDescription: z
    .string()
    .trim()
    .min(1, 'Deskripsi singkat wajib diisi.')
    .max(500, 'Deskripsi singkat maksimal 500 karakter.'),

  description: z
    .string()
    .trim()
    .min(1, 'Deskripsi wajib diisi.')
    .max(20000, 'Deskripsi terlalu panjang.'),

  pricingType: z.enum(['FIXED', 'STARTING_FROM'], {
    message: 'Tipe harga tidak valid.',
  }),

  price: z.coerce
    .number({ message: 'Harga wajib diisi.' })
    .positive('Harga harus lebih besar dari 0.'),

  originalPrice: optionalPositiveNumber('Harga diskon tidak valid.'),

  material: optionalText(120),
  craftingTime: optionalText(120),

  stoneType: z
    .string()
    .trim()
    .min(1, 'Jenis marmer wajib diisi.')
    .max(120, 'Jenis marmer maksimal 120 karakter.'),

  color: z
    .string()
    .trim()
    .min(1, 'Warna wajib diisi.')
    .max(120, 'Warna maksimal 120 karakter.'),

  dimensions: z
    .string()
    .trim()
    .min(1, 'Dimensi wajib diisi.')
    .max(120, 'Dimensi maksimal 120 karakter.'),

  weightGrams: z.coerce
    .number({ message: 'Berat wajib diisi.' })
    .int('Berat harus berupa bilangan bulat.')
    .positive('Berat harus lebih besar dari 0.'),

  shopeeUrl: optionalText(500)
    .refine(
      (value) => {
        if (value === undefined) return true;
        try {
          const url = new URL(value);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'Tautan Shopee tidak valid.' }
    ),

  isAvailable: z.coerce.boolean().default(true),
  isUniquePiece: z.coerce.boolean().default(false),
  isFeatured: z.coerce.boolean().default(false),
  whatsappEnabled: z.coerce.boolean().default(true),
};

/**
 * Cross-field rule mirroring the database CHECK constraint:
 * a reference price, when present, must be strictly greater than the price.
 */
function refinePricing(
  data: { price?: number; originalPrice?: number },
  ctx: z.RefinementCtx
) {
  if (
    typeof data.price === 'number' &&
    typeof data.originalPrice === 'number' &&
    data.originalPrice <= data.price
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['originalPrice'],
      message: 'Harga diskon harus lebih besar dari harga awal.',
    });
  }
}

export const createProductSchema = z
  .object({
    ...productBaseShape,
    specifications: z.array(productSpecificationInputSchema).default([]),
    images: z
      .array(productImageInputSchema)
      .min(1, 'Minimal satu foto produk harus tersedia.'),
  })
  .superRefine(refinePricing);

export const updateProductSchema = z
  .object({
    ...productBaseShape,
    specifications: z.array(productSpecificationInputSchema).default([]),
    images: z
      .array(productImageInputSchema)
      .min(1, 'Minimal satu foto produk harus tersedia.'),
  })
  .superRefine(refinePricing);

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/**
 * Converts the validated specification rows into the JSON shape stored in
 * `Product.specifications`. Rows missing either half are dropped, so an
 * accidentally blank row cannot poison the stored JSON.
 */
export function specificationsToJson(
  rows: { label: string; value: string }[]
): { label: string; value: string }[] | undefined {
  const cleaned = rows
    .map((row) => ({ label: row.label.trim(), value: row.value.trim() }))
    .filter((row) => row.label.length > 0 && row.value.length > 0);

  return cleaned.length > 0 ? cleaned : undefined;
}
