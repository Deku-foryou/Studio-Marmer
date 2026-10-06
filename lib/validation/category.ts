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
  name: z.string().trim().max(100, `Maksimal 100 karakter.`),
  description: optionalText(500),
  imageUrl: optionalUrl,
  sortOrder: optionalNonNegativeInt,
  isActive: z.boolean().optional(),
});

/** Update category schema – only the fields that may be changed.
 *  The slug is preserved server-side; it is NOT part of this schema. */
export const updateCategorySchema = z.object({
  name: optionalText(100),
  description: optionalText(500).optional(),
  imageUrl: optionalUrl.optional(),
  sortOrder: optionalNonNegativeInt.optional(),
  isActive: z.boolean().optional(),
});