/**
 * End-to-end check of the row-limit fix through the REAL submission path.
 *
 * This script used to keep a hand-written copy of the FormData row loops,
 * because `readFormData` was private to `produk/actions.ts` — a `'use server'`
 * module that may only export async functions. The consequence was bad: editing
 * the shipped parser in `produk/actions.ts` left this script green, so it
 * validated the shape of the algorithm rather than the code that actually runs.
 *
 * That constraint is gone. The parser and the shared validation entry point now
 * live in `lib/validation/product-form-data.ts`, so the calls below ARE the
 * production ones. A regression in the parser fails here.
 *
 * The action module itself still cannot be imported — it pulls in Prisma and
 * Auth.js — so the last section asserts by source inspection that both actions
 * really do route through `parseProductSubmission`, and that nobody re-inlines a
 * private copy of the loops.
 *
 *   npm run test:row-action
 */
import { readFileSync } from 'node:fs';

import {
  parseProductSubmission,
  readProductFormData,
} from './lib/validation/product-form-data';
import {
  createProductSchema,
  updateProductSchema,
} from './lib/validation/product';
import {
  IMAGES_LIMIT_MESSAGE,
  MAX_PRODUCT_ROWS,
  SPECIFICATIONS_LIMIT_MESSAGE,
} from './lib/validation/product-rows';

let failures = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  if (cond) console.log(`  PASS  ${label}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${label}`, detail ?? '');
  }
}
function section(t: string) {
  console.log(`\n--- ${t} ---`);
}

/** A complete, valid product submission. Overridden per case. */
function validFields(): Record<string, string> {
  return {
    name: 'Tempat Tisu Marmer',
    categoryId: '1',
    shortDescription: 'Deskripsi singkat',
    description: 'Deskripsi panjang',
    pricingType: 'FIXED',
    price: '185000',
    stoneType: 'Carrara',
    color: 'Putih',
    dimensions: '15x12x11',
    weightGrams: '2400',
  };
}

/** Builds FormData from indexed row entries. */
function formData(opts: {
  specCount: number;
  imageCount: number;
  extraSpecs?: number;
  extraImages?: number;
  blankTrailingSpecs?: number;
  blankTrailingImages?: number;
  includeRequiredFields?: boolean;
}) {
  const fd = new FormData();
  if (opts.includeRequiredFields !== false) {
    for (const [key, value] of Object.entries(validFields())) fd.set(key, value);
  }
  for (let i = 0; i < opts.specCount; i++) {
    fd.set(`spec_${i}_label`, `Label ${i}`);
    fd.set(`spec_${i}_value`, `Nilai ${i}`);
  }
  for (let i = 0; i < opts.imageCount; i++) {
    fd.set(`image_${i}_url`, `https://res.cloudinary.com/demo/image/upload/v1/p${i}.png`);
    fd.set(`image_${i}_alt`, `Alt ${i}`);
    fd.set(`image_${i}_publicId`, `pid/${i}`);
  }
  for (let k = 0; k < (opts.extraSpecs ?? 0); k++) {
    const i = opts.specCount + k;
    fd.set(`spec_${i}_label`, `Latarang ${i}`);
    fd.set(`spec_${i}_value`, `Nilai ${i}`);
  }
  for (let k = 0; k < (opts.extraImages ?? 0); k++) {
    const i = opts.imageCount + k;
    fd.set(`image_${i}_url`, `https://res.cloudinary.com/demo/image/upload/v1/x${i}.png`);
    fd.set(`image_${i}_alt`, `Alt ${i}`);
    fd.set(`image_${i}_publicId`, `pid/${i}`);
  }
  for (let k = 0; k < (opts.blankTrailingSpecs ?? 0); k++) {
    const i = opts.specCount + (opts.extraSpecs ?? 0) + k;
    fd.set(`spec_${i}_label`, '');
    fd.set(`spec_${i}_value`, '');
  }
  for (let k = 0; k < (opts.blankTrailingImages ?? 0); k++) {
    const i = opts.imageCount + (opts.extraImages ?? 0) + k;
    fd.set(`image_${i}_url`, '');
    fd.set(`image_${i}_alt`, '');
    fd.set(`image_${i}_publicId`, '');
  }
  return fd;
}

const N = MAX_PRODUCT_ROWS;

// ═══ 1. Boundary: 25 and 26 rows are accepted ═══════════════════════════════
section(`25 and 26 rows are accepted (max ${N})`);

for (const n of [25, N]) {
  const r = parseProductSubmission(formData({ specCount: n, imageCount: 1 }), createProductSchema);
  check(`${n} specs -> no field errors`, r.ok || Object.keys(r.fieldErrors).length === 0, r);
  const kept = readProductFormData(formData({ specCount: n, imageCount: 1 })).specifications;
  check(`${n} specs -> parser kept all ${n}`, kept.length === n, kept.length);
}
for (const n of [25, N]) {
  const r = parseProductSubmission(formData({ specCount: 1, imageCount: n }), createProductSchema);
  check(`${n} images -> no field errors`, r.ok || Object.keys(r.fieldErrors).length === 0, r);
  const kept = readProductFormData(formData({ specCount: 1, imageCount: n })).images;
  check(`${n} images -> parser kept all ${n}`, kept.length === n, kept.length);
}

// ═══ 2. One row past the cap is rejected ═════════════════════════════════════
section('27 rows are rejected with a renderable field error');
{
  const fd = formData({ specCount: N, imageCount: 1, extraSpecs: 1 });
  // The loop reads one index past the cap before stopping, so a contiguous
  // over-limit submission is NOT silently shortened: all 27 rows reach Zod and
  // it rejects on its own `.max()`. `findRowOverflow` is what covers the sparse
  // case below, where the parser does stop early.
  const parsed = readProductFormData(fd);
  check('27 specs -> the parser reads every submitted row', parsed.specifications.length === N + 1, parsed.specifications.length);
  check('  including the row one past the cap',
    parsed.specifications[N]?.label === `Latarang ${N}`, parsed.specifications[N]);
  check('  so the schema rejects it on its own .max()', createProductSchema.safeParse(parsed).success === false);

  const r = parseProductSubmission(fd, createProductSchema);
  const errs = r.ok ? {} : r.fieldErrors;
  check('27 specs -> rejected', r.ok === false, r);
  check('27 specs -> fieldErrors.specifications present', typeof errs.specifications === 'string', errs);
  check('  message is the Indonesian limit text', /Maksimal 26 baris spesifikasi\./.test(errs.specifications ?? ''), errs.specifications);
  check('  message is the shared constant', errs.specifications === SPECIFICATIONS_LIMIT_MESSAGE, errs.specifications);
  check('  images NOT flagged', errs.images === undefined, errs);
}
{
  const fd = formData({ specCount: 1, imageCount: N, extraImages: 1 });
  const parsed = readProductFormData(fd);
  check('27 images -> the parser reads every submitted slot', parsed.images.length === N + 1, parsed.images.length);
  check('  so the schema rejects it on its own .max()', createProductSchema.safeParse(parsed).success === false);

  const r = parseProductSubmission(fd, createProductSchema);
  const errs = r.ok ? {} : r.fieldErrors;
  check('27 images -> rejected', r.ok === false, r);
  check('27 images -> fieldErrors.images present', typeof errs.images === 'string', errs);
  check('  message is the Indonesian limit text', /Maksimal 26 foto produk\./.test(errs.images ?? ''), errs.images);
  check('  message is the shared constant', errs.images === IMAGES_LIMIT_MESSAGE, errs.images);
}

// ═══ 3. The silent-truncation case the pairing exists for ════════════════════
section('A row past a blank slot is truncated by the parser, caught by findRowOverflow');
{
  // The parser stops at the first blank index after the cap, so `spec_27` is
  // never read: Zod would see a perfectly valid 26 rows and pass. Only the
  // overflow scan sees the 28th key. Both halves of the rule are asserted.
  const fd = formData({ specCount: N, imageCount: 1, blankTrailingSpecs: 1 });
  fd.set('spec_27_label', 'Latarang 27');
  fd.set('spec_27_value', 'Nilai 27');

  const parsed = readProductFormData(fd);
  check('parser really did truncate at 26 (spec_27 never read)', parsed.specifications.length === N, parsed.specifications.length);
  check('the truncated 26 rows are all valid', createProductSchema.safeParse(parsed).success);

  const r = parseProductSubmission(fd, createProductSchema);
  const errs = r.ok ? {} : r.fieldErrors;
  check('submission is still rejected', r.ok === false, r);
  check('  reported against `specifications`', errs.specifications === SPECIFICATIONS_LIMIT_MESSAGE, errs);
}

// ═══ 4. Blank trailing rows do not produce a false error ════════════════════
section('Blank trailing rows do not produce a false error');
{
  const r = parseProductSubmission(
    formData({ specCount: N, imageCount: N, blankTrailingSpecs: 8, blankTrailingImages: 8 }),
    createProductSchema
  );
  check('26 real + 8 blank of each -> no field errors', r.ok || Object.keys(r.fieldErrors).length === 0, r);
  const parsed = readProductFormData(formData({ specCount: N, imageCount: N, blankTrailingSpecs: 8, blankTrailingImages: 8 }));
  check('  all 26 real rows kept', parsed.specifications.length === N && parsed.images.length === N, {
    s: parsed.specifications.length, i: parsed.images.length });
}
{
  // Blank rows interleaved BELOW the limit, which the filter already handles.
  const fd = formData({ specCount: 2, imageCount: 1 });
  fd.set('spec_2_label', '   ');
  fd.set('spec_2_value', '');
  const r = parseProductSubmission(fd, createProductSchema);
  check('in-range blank row still filtered, no error', r.ok || Object.keys(r.fieldErrors).length === 0, r);
}

// ═══ 5. Empty submission ═════════════════════════════════════════════════════
section('An empty submission reads as empty, and is rejected on its own merits');
{
  const parsed = readProductFormData(new FormData());
  check('no specifications', parsed.specifications.length === 0, parsed.specifications.length);
  check('no images', parsed.images.length === 0, parsed.images.length);
  check('scalars default to empty strings', parsed.name === '' && parsed.price === '', {
    name: parsed.name, price: parsed.price });
  check('unchecked flags read as false', parsed.isAvailable === false && parsed.isFeatured === false, {
    isAvailable: parsed.isAvailable, isFeatured: parsed.isFeatured });

  const r = parseProductSubmission(new FormData(), createProductSchema);
  const errs = r.ok ? {} : r.fieldErrors;
  check('rejected', r.ok === false, r);
  check('  name is reported missing', typeof errs.name === 'string', errs);
  check('  images is reported missing', typeof errs.images === 'string', errs);
  check('  no row-limit error invented', errs.specifications === undefined, errs);
}

// ═══ 6. Incomplete rows ═════════════════════════════════════════════════════
section('Half-filled rows: kept by the filter, rejected by the schema');
{
  const fd = formData({ specCount: 1, imageCount: 1 });
  fd.set('spec_1_label', 'Label tanpa nilai');
  fd.set('spec_1_value', '');
  const parsed = readProductFormData(fd);
  check('label-only row survives the parser filter', parsed.specifications.length === 2, parsed.specifications);
  check('  and keeps its half-empty value verbatim', parsed.specifications[1].value === '', parsed.specifications[1]);

  const r = parseProductSubmission(fd, createProductSchema);
  const errs = r.ok ? {} : r.fieldErrors;
  check('schema rejects the incomplete row', r.ok === false, r);
  check('  error is on `specifications`', typeof errs.specifications === 'string', errs);
}
{
  // An image slot with alt text but no URL is dropped by the parser, which is
  // what makes "save with zero photos" work.
  const fd = formData({ specCount: 1, imageCount: 1 });
  fd.set('image_1_alt', 'Alt tanpa URL');
  fd.set('image_1_publicId', 'pid/1');
  const parsed = readProductFormData(fd);
  check('url-less image slot is dropped', parsed.images.length === 1, parsed.images);
}
{
  // The mirror image of the label-only row: a value with no label. The filter is
  // an `||`, so this row must survive too — it is the half that a "keep rows
  // with a label" reading would silently drop.
  const fd = formData({ specCount: 1, imageCount: 1 });
  fd.set('spec_1_label', '');
  fd.set('spec_1_value', 'Nilai tanpa label');
  const parsed = readProductFormData(fd);
  check('value-only row survives the parser filter', parsed.specifications.length === 2, parsed.specifications);
  check('  and keeps its value verbatim', parsed.specifications[1]?.value === 'Nilai tanpa label', parsed.specifications[1]);

  const r = parseProductSubmission(fd, createProductSchema);
  const errs = r.ok ? {} : r.fieldErrors;
  check('schema rejects the value-only row', r.ok === false, r);
  check('  error is on `specifications`', typeof errs.specifications === 'string', errs);
}

// ═══ 7. Processing order ════════════════════════════════════════════════════
section('Rows come back in index order, even across a gap');
{
  const fd = formData({ specCount: 0, imageCount: 0 });
  fd.set('spec_0_label', 'L0');
  fd.set('spec_0_value', 'V0');
  fd.set('spec_1_label', 'L1');
  fd.set('spec_1_value', 'V1');
  // Index 2 is absent entirely.
  fd.set('spec_3_label', 'L3');
  fd.set('spec_3_value', 'V3');

  const specs = readProductFormData(fd).specifications;
  check('three rows survive, in ascending index order',
    JSON.stringify(specs) === JSON.stringify([
      { label: 'L0', value: 'V0' },
      { label: 'L1', value: 'V1' },
      { label: 'L3', value: 'V3' },
    ]), specs);
}
{
  const fd = formData({ specCount: 0, imageCount: 0 });
  fd.set('image_0_url', 'https://a.test/0.png');
  fd.set('image_0_alt', 'A0');
  fd.set('image_0_publicId', 'pid/0');
  fd.set('image_1_url', 'https://a.test/1.png');
  const images = readProductFormData(fd).images;
  check('image fields are mapped url/alt/publicId in order',
    JSON.stringify(images) === JSON.stringify([
      { imageUrl: 'https://a.test/0.png', altText: 'A0', publicId: 'pid/0' },
      { imageUrl: 'https://a.test/1.png', altText: '', publicId: '' },
    ]), images);
}
{
  // The checkboxes carry no `value` attribute, so the browser submits the HTML
  // default. The parser's `'on'` comparison is what makes them round-trip.
  const fd = formData({ specCount: 1, imageCount: 1 });
  fd.set('isAvailable', 'on');
  fd.set('whatsappEnabled', 'on');
  const parsed = readProductFormData(fd);
  check('a submitted checkbox reads true', parsed.isAvailable === true && parsed.whatsappEnabled === true, parsed);
  check('an untouched checkbox reads false', parsed.isFeatured === false && parsed.isUniquePiece === false, parsed);
}

// ═══ 8. Create and update use the identical path ═════════════════════════════
section('Create and update use the identical path');
{
  const over = formData({ specCount: N, imageCount: 1, extraSpecs: 1 });
  const a = parseProductSubmission(over, createProductSchema);
  const b = parseProductSubmission(over, updateProductSchema);
  const errsA = a.ok ? {} : a.fieldErrors;
  const errsB = b.ok ? {} : b.fieldErrors;
  check('same input -> same field errors from both schemas', JSON.stringify(errsA) === JSON.stringify(errsB), { errsA, errsB });
  check('both report specifications', errsA.specifications === errsB.specifications);

  const good = formData({ specCount: 2, imageCount: 2 });
  const okCreate = parseProductSubmission(good, createProductSchema);
  const okUpdate = parseProductSubmission(good, updateProductSchema);
  check('a valid submission is accepted by create', okCreate.ok === true, okCreate);
  check('a valid submission is accepted by update', okUpdate.ok === true, okUpdate);
  check('  and both yield identical data', okCreate.ok && okUpdate.ok
    ? JSON.stringify(okCreate.data) === JSON.stringify(okUpdate.data)
    : false);
}

// ═══ 9. The actions really route through the extracted module ════════════════
section('produk/actions.ts delegates instead of keeping its own copy');
{
  const src = readFileSync('app/(admin)/admin/(dashboard)/produk/actions.ts', 'utf8');
  const uses = (src.match(/parseProductSubmission\(formData,/g) ?? []).length;
  check('both create and update call parseProductSubmission', uses === 2, uses);
  check('neither action calls safeParse(readFormData...) directly',
    !/Schema\.safeParse\(readFormData/.test(src));
  check('the parser is imported from lib/validation/product-form-data',
    /from '@\/lib\/validation\/product-form-data'/.test(src));
  check('no private copy of the row loops is inlined in the action',
    !/spec_\$\{i\}_label/.test(src));
  check('readFormData is no longer defined in the action',
    !/function readFormData\b/.test(src));
  // A 'use server' module may only export async functions.
  const exports = src.match(/^export\s+(?!async)/gm) ?? [];
  check('the action module still exports nothing but async functions',
    exports.length === 0, exports);
}

// ═══ 10. Both sections over the limit ═══════════════════════════════════════
section('Both sections over the limit report both fields');
{
  const r = parseProductSubmission(
    formData({ specCount: N, imageCount: N, extraSpecs: 2, extraImages: 2 }),
    createProductSchema
  );
  const errs = r.ok ? {} : r.fieldErrors;
  check('both keys present', Boolean(errs.specifications && errs.images), errs);
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);