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

/**
 * Optional Cloudinary public id.
 *
 * The category image is uploaded from the browser by an unsigned preset, so both
 * the URL and the public id arrive as form fields and are as untrusted as any
 * other input. The shape is checked here rather than trusted: a single relative
 * path segment, no scheme, no whitespace, bounded length.
 */
const optionalPublicId = z
  .string()
  .trim()
  .max(255, 'Maksimal 255 karakter.')
  .transform((value) => (value.length === 0 ? undefined : value))
  .refine(
    (val) =>
      val === undefined || /^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(val),
    'Public ID tidak valid.'
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
  publicId: optionalPublicId,
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
  publicId: optionalPublicId,
  sortOrder: optionalNonNegativeInt,
  isActive: z.boolean(),
});

/**
 * Resolves the image columns to persist for a create/update submission.
 *
 * `imageUrl` and `publicId` are written and cleared as a pair. Keeping them in
 * lockstep matters: a URL without its public id is an asset we cannot later
 * identify, and a public id without its URL points at nothing renderable. When
 * the admin removes the image both become null; when they submit an image the
 * pair is stored together.
 */
export function toCategoryImageColumns(input: {
  imageUrl?: string;
  publicId?: string;
}): { imageUrl: string | null; publicId: string | null } {
  const url = input.imageUrl ?? null;
  const publicId = input.publicId ?? null;

  return {
    imageUrl: url,
    // A URL with no public id is still stored — the image is perfectly usable
    // today, and the id is only needed for future asset management.
    publicId,
  };
}