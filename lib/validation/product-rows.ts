/**
 * Row limits for the repeatable product rows, and overflow detection.
 *
 * WHY THIS IS ITS OWN MODULE
 * Two audiences need the same number:
 *
 *   - the server (`lib/validation/product.ts` for the Zod `.max()`, and
 *     `produk/actions.ts` for the FormData parser), and
 *   - the browser (`ProductForm.tsx` and `ProductImageUploader.tsx`, which cap
 *     their add controls so an admin cannot build a list the server will reject).
 *
 * It deliberately imports nothing — not `zod`, not `next/*`. A client component
 * importing `MAX_PRODUCT_ROWS` from `lib/validation/product.ts` would drag the
 * whole Zod schema into the browser bundle for the sake of one integer. Keeping
 * the constant and the parser-side check here is what makes it safe to share.
 *
 * WHY OVERFLOW MUST BE DETECTED AT ALL
 * `readFormData` collects the indexed keys `spec_0_label … spec_25_label` and
 * `image_0_url … image_25_url`, then stops. A submission carrying a 27th row is
 * therefore *truncated* before Zod ever sees it: the schema's `.max()` receives
 * 26 items and passes, and the extra row vanishes without a word. The admin
 * believes their photo was saved. That is the silent data loss this module
 * exists to prevent — see `findRowOverflow`.
 */

/**
 * Maximum number of specification rows and of image slots in a submission.
 *
 * Equals the number of indexed keys the form renders (0 … MAX-1), which is what
 * the parser reads. The Zod `.max()` and this constant must stay equal: a lower
 * schema limit would reject a save the form can legitimately produce, and a
 * higher one would be unreachable.
 */
export const MAX_PRODUCT_ROWS = 26;

/** Shared messages, so the schema error and the overflow error read alike. */
export const SPECIFICATIONS_LIMIT_MESSAGE = `Maksimal ${MAX_PRODUCT_ROWS} baris spesifikasi.`;
export const IMAGES_LIMIT_MESSAGE = `Maksimal ${MAX_PRODUCT_ROWS} foto produk.`;

/** Shown in the form once the admin has reached the cap. */
export const SPECIFICATIONS_LIMIT_HINT = `Batas ${MAX_PRODUCT_ROWS} baris spesifikasi tercapai. Hapus satu baris untuk menambah.`;
export const IMAGES_LIMIT_HINT = `Batas ${MAX_PRODUCT_ROWS} foto tercapai. Hapus satu foto untuk menambah.`;

/** Which repeatable section carried rows past the cap. */
export type ProductRowOverflow = {
  specifications: boolean;
  images: boolean;
};

const SPEC_KEY = /^spec_(\d+)_(label|value)$/;
const IMAGE_KEY = /^image_(\d+)_(url|alt|publicId)$/;

/** A row at or past this index is outside the range the parser reads. */
const FIRST_INDEX_PAST_LIMIT = MAX_PRODUCT_ROWS;

function isFilled(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Reports whether a submission carries rows beyond `MAX_PRODUCT_ROWS`.
 *
 * `entries` is `formData.entries()`; it is iterated exactly once, so the cost is
 * proportional to the keys actually submitted and never to an assumed maximum.
 * That matters: an unbounded `for (let i = 0; ; i++)` scan would let a crafted
 * request with a million indexed keys spin the CPU.
 *
 * "Beyond the limit" means a row that WOULD have been kept had the parser read
 * it — mirroring the parser's own post-read filters exactly:
 *
 *   - specifications: kept when the label or the value is non-blank
 *   - images: kept only when the URL is non-blank (the parser drops a slot with
 *     no URL, which is what makes "save with zero photos" work)
 *
 * Blank trailing rows therefore do NOT raise an error, so a form that renders
 * an empty spare row can never trip this by accident.
 */
export function findRowOverflow(
  entries: Iterable<[string, FormDataEntryValue]>
): ProductRowOverflow {
  const overflow: ProductRowOverflow = { specifications: false, images: false };

  for (const [key, value] of entries) {
    const spec = SPEC_KEY.exec(key);
    if (spec) {
      if (
        !overflow.specifications &&
        Number(spec[1]) >= FIRST_INDEX_PAST_LIMIT &&
        isFilled(value)
      ) {
        overflow.specifications = true;
      }
      continue;
    }

    const image = IMAGE_KEY.exec(key);
    if (image) {
      // Only `_url` decides survival (see the doc comment), so an alt-text-only
      // or publicId-only slot past the limit is correctly treated as empty.
      if (
        !overflow.images &&
        image[2] === 'url' &&
        Number(image[1]) >= FIRST_INDEX_PAST_LIMIT &&
        isFilled(value)
      ) {
        overflow.images = true;
      }
    }

    // Both flags are already set: nothing left to learn from the remaining keys.
    if (overflow.specifications && overflow.images) break;
  }

  return overflow;
}

/** Field-keyed messages for whichever sections overflowed. Empty when none did. */
export function overflowFieldErrors(
  overflow: ProductRowOverflow
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (overflow.specifications) errors.specifications = SPECIFICATIONS_LIMIT_MESSAGE;
  if (overflow.images) errors.images = IMAGES_LIMIT_MESSAGE;
  return errors;
}
