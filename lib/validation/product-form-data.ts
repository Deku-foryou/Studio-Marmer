/**
 * Reads a product submission out of `FormData` and validates it.
 *
 * WHY THIS IS ITS OWN MODULE
 * `produk/actions.ts` is a `'use server'` file, and such a module may only export
 * async functions — the same constraint documented in
 * `lib/validation/product-action-state.ts`. So the parsing and validation logic
 * could never be exported from there, and could therefore never be imported by a
 * test either: importing the action module at all would pull in Prisma and
 * Auth.js. That is why `test-row-limit-action.mts` used to keep a hand-written
 * copy of these loops, which validated the *shape of the algorithm* rather than
 * the shipped code — a change to the real parser would have left it green.
 *
 * Nothing here touches Next.js, Prisma, the session, or any other effect. The
 * only inputs are a `FormData` and a Zod schema; the only outputs are plain
 * data. That makes the whole submission path testable without a database, and it
 * is the reason the row-limit fix can be verified against the real
 * implementation rather than a copy of it.
 */

import {
  createProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
  updateProductSchema,
} from './product';
import {
  findRowOverflow,
  MAX_PRODUCT_ROWS,
  overflowFieldErrors,
} from './product-rows';

/**
 * Reads the structured spec/image row inputs produced by the form.
 * The form serialises each repeatable row as indexed keys:
 *   spec_0_label, spec_0_value, image_0_url, image_0_alt, ...
 *
 * ROWS BEYOND THE LIMIT
 * The loops below read indices `0 … MAX_PRODUCT_ROWS - 1` and stop. A crafted or
 * stale submission carrying a further row is therefore TRUNCATED here, before
 * Zod runs: the schema's `.max()` would receive exactly 26 items and pass, and
 * the extra row would disappear with no error at all — the admin would believe
 * their 27th photo was saved.
 *
 * `findRowOverflow` closes that gap by inspecting the submitted keys once, so
 * the caller can reject the submission instead of quietly dropping data. The
 * two are deliberately paired: neither is sufficient alone.
 */
export function readProductFormData(formData: FormData) {
  const getString = (key: string): string => {
    const value = formData.get(key);
    return typeof value === 'string' ? value : '';
  };

  const lastIndex = MAX_PRODUCT_ROWS - 1;

  const specifications: { label: string; value: string }[] = [];
  for (let i = 0; ; i += 1) {
    const label = getString(`spec_${i}_label`);
    const value = getString(`spec_${i}_value`);
    if (!label && !value && i > lastIndex) break;
    specifications.push({ label, value });
    if (i > lastIndex) break;
  }

  /**
   * Images arrive as indexed hidden inputs written by the uploader component,
   * one triple per slot in display order:
   *   image_0_url, image_0_publicId, image_0_alt, image_1_url, ...
   *
   * The public id is optional: a slot that predates Cloudinary hosting, or an
   * image hosted elsewhere, simply omits it. A row with no URL at all is dropped
   * below, which is what makes "save with zero photos" work.
   */
  const images: {
    imageUrl: string;
    altText: string;
    publicId: string;
  }[] = [];
  for (let i = 0; ; i += 1) {
    const imageUrl = getString(`image_${i}_url`);
    const altText = getString(`image_${i}_alt`);
    const publicId = getString(`image_${i}_publicId`);
    if (!imageUrl && !altText && !publicId && i > lastIndex) break;
    images.push({ imageUrl, altText, publicId });
    if (i > lastIndex) break;
  }

  return {
    name: getString('name'),
    categoryId: getString('categoryId'),
    shortDescription: getString('shortDescription'),
    description: getString('description'),
    pricingType: getString('pricingType'),
    price: getString('price'),
    originalPrice: getString('originalPrice'),
    material: getString('material'),
    stoneType: getString('stoneType'),
    color: getString('color'),
    dimensions: getString('dimensions'),
    weightGrams: getString('weightGrams'),
    craftingTime: getString('craftingTime'),
    shopeeUrl: getString('shopeeUrl'),
    isAvailable: formData.get('isAvailable') === 'on',
    isUniquePiece: formData.get('isUniquePiece') === 'on',
    isFeatured: formData.get('isFeatured') === 'on',
    whatsappEnabled: formData.get('whatsappEnabled') === 'on',
    specifications: specifications.filter(
      (row) => row.label.trim() !== '' || row.value.trim() !== ''
    ),
    images: images.filter((row) => row.imageUrl.trim() !== ''),
  };
}

/**
 * Turns a Zod failure into the flat field-error map the form expects.
 */
function toFieldErrors(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): Record<string, string> {
  const { fieldErrors } = error.flatten();
  const out: Record<string, string> = {};

  for (const [key, messages] of Object.entries(fieldErrors)) {
    const first = messages?.[0];
    if (first) out[key] = first;
  }

  return out;
}

/**
 * Validates a product submission and returns either the parsed input or the
 * field errors to render.
 *
 * SHARED BY CREATE AND UPDATE ON PURPOSE
 * The row-limit rule must be identical for a new product and an edited one. A
 * check written into only one action would leave the other silently truncating,
 * which is the exact failure being fixed here.
 *
 * Overflow is merged into the Zod errors rather than replacing them, so a
 * submission that is both over the limit and missing a required field reports
 * both problems in one round trip instead of one per attempt.
 */
export function parseProductSubmission(
  formData: FormData,
  schema: typeof createProductSchema | typeof updateProductSchema
):
  | { ok: true; data: CreateProductInput | UpdateProductInput }
  | { ok: false; fieldErrors: Record<string, string> } {
  const parsed = schema.safeParse(readProductFormData(formData));

  /*
   * Checked against the RAW FormData, not the parsed arrays: by the time Zod
   * runs, any row past the limit has already been dropped by readProductFormData
   * and is no longer visible. Scanning the submitted keys is the only place the
   * extra row still exists.
   */
  const overflow = findRowOverflow(formData.entries());

  const fieldErrors: Record<string, string> = parsed.success
    ? {}
    : toFieldErrors(parsed.error);
  Object.assign(fieldErrors, overflowFieldErrors(overflow));

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  // `fieldErrors` is empty, which only happens when `parsed` succeeded.
  return { ok: true, data: parsed.data as CreateProductInput | UpdateProductInput };
}