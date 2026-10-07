import { z } from 'zod';

/** Trimmed string, or `undefined` when the admin left the field blank. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter.`)
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional();

/** Optional URL string – accepts relative paths, http(s) URLs, or `undefined`. */
const optionalUrl = z
  .string()
  .trim()
  .max(500, `Maksimal 500 karakter.`)
  .transform((value) => (value.length === 0 ? undefined : value))
  .refine(
    (val) => val === undefined || /^https?:\/\//i.test(val) || val.startsWith('/'),
    'URL tidak valid.'
  )
  .optional();

/** Optional positive integer (>= 0) from a text field. */
const optionalNonNegativeInt = z
  .preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    z
      .coerce.number({ message: 'sortOrder harus berupa angka.' })
      .int({ message: 'sortOrder harus bilangan bulat.' })
      .min(0, 'sortOrder tidak boleh negatif.')
      .optional()
  );

/** Create category schema – slug is auto-generated server-side. */
export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nama kategori wajib diisi.')
    .max(100, `Maksimal 100 karakter.`),
  description: optionalText(500),
  imageUrl: optionalUrl,
  sortOrder: optionalNonNegativeInt,
  isActive: z.boolean().optional(),
});

/** Update category schema.
 *
 * The form always submits every field, so the shape matches the create schema
 * and a blank name is rejected rather than silently wiping the category. The
 * slug is preserved server-side and is NOT part of this schema. */
export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi.').max(100, 'Maksimal 100 karakter.'),
  description: optionalText(500),
  imageUrl: optionalUrl,
  sortOrder: optionalNonNegativeInt,
  isActive: z.boolean(),
});