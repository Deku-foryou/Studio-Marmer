import { z } from 'zod';

/**
 * Server-side validation for a gallery photograph.
 *
 * The upload happens in the browser against an unsigned Cloudinary preset, so
 * `imageUrl` and `publicId` arrive as ordinary form fields - exactly as untrusted
 * as any other input. They are shape-checked here rather than trusted; see
 * lib/cloudinary-upload.ts for why no secret is involved.
 *
 * All messages are Indonesian, matching the rest of the admin UI.
 */

/** Trimmed string, or `undefined` when the admin left the field blank. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional();

/**
 * Required delivery URL for the photograph.
 *
 * A gallery tile with no picture would render broken, so this is the one field
 * with no "blank is fine" path. Both an absolute https URL from Cloudinary and a
 * site-relative path (for a bundled asset, or a row that predates Cloudinary
 * hosting) are accepted, matching `optionalMediaUrl` in lib/validation/
 * site-settings.ts.
 */
const requiredMediaUrl = z
  .string()
  .trim()
  .min(1, 'Foto galeri wajib diunggah.')
  .max(500, 'Maksimal 500 karakter.')
  .refine(
    (value) => {
      if (value.startsWith('/')) return true;
      try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:';
      } catch {
        return false;
      }
    },
    { message: 'URL foto tidak valid.' }
  )
  .refine((value) => !/["'()\s<>]/.test(value), {
    message: 'URL foto tidak valid.',
  });

/**
 * Optional Cloudinary public id: a single relative path segment, no scheme, no
 * whitespace, bounded length.
 */
const optionalPublicId = z
  .string()
  .trim()
  .max(255, 'Maksimal 255 karakter.')
  .transform((value) => (value.length === 0 ? undefined : value))
  .refine(
    (value) => value === undefined || /^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(value),
    'Public ID tidak valid.'
  )
  .optional();

/** Optional non-negative integer from a text field. */
const optionalNonNegativeInt = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z
    .coerce.number({ message: 'Urutan harus berupa angka.' })
    .int({ message: 'Urutan harus bilangan bulat.' })
    .min(0, 'Urutan tidak boleh negatif.')
    .optional()
);

/**
 * Shared field shape for both modes.
 *
 * `isActive` is included on create rather than defaulted away: the form always
 * submits it, and reading it explicitly means an unticked box on the create form
 * stores `false` instead of silently becoming `true`.
 */
const galleryItemShape = {
  title: z
    .string()
    .trim()
    .min(1, 'Judul foto wajib diisi.')
    .max(160, 'Judul foto maksimal 160 karakter.'),
  description: optionalText(2000, 'Deskripsi maksimal 2000 karakter.'),
  imageUrl: requiredMediaUrl,
  publicId: optionalPublicId,
  altText: optionalText(255, 'Teks alternatif maksimal 255 karakter.'),
  sortOrder: optionalNonNegativeInt,
  isActive: z.boolean(),
};

export const createGalleryItemSchema = z.object(galleryItemShape);

export const updateGalleryItemSchema = z.object(galleryItemShape);

export type GalleryItemInput = z.infer<typeof createGalleryItemSchema>;

/**
 * Resolves the media columns to persist.
 *
 * `publicId` is only stored alongside a URL - a public id with no delivery URL
 * describes nothing renderable, so it is dropped rather than persisted.
 */
export function toGalleryImageColumns(input: {
  imageUrl: string;
  publicId?: string;
}): { imageUrl: string; publicId: string | null } {
  return {
    imageUrl: input.imageUrl,
    publicId: input.publicId ?? null,
  };
}