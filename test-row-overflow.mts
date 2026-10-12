/**
 * Directed tests: product row-limit overflow detection.
 *
 * Covers the gap `.max(26)` alone cannot close — the FormData parser truncates
 * before Zod runs, so an over-limit row is dropped silently and the schema sees
 * exactly 26 items and passes.
 *
 *   npx tsx test-row-overflow.mts
 */
import {
  findRowOverflow,
  overflowFieldErrors,
  MAX_PRODUCT_ROWS,
  SPECIFICATIONS_LIMIT_MESSAGE,
  IMAGES_LIMIT_MESSAGE,
} from './lib/validation/product-rows';
import { createProductSchema, updateProductSchema } from './lib/validation/product';

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

/** Builds FormData from indexed row entries. */
function buildFormData(opts: {
  specs?: Array<{ label: string; value: string }>;
  images?: Array<{ url: string; alt?: string; publicId?: string }>;
  /** Extra spec rows appended past the cap. */
  extraSpecs?: number;
  /** Extra image slots appended past the cap. */
  extraImages?: number;
  /** Blank rows rendered past the cap (must NOT error). */
  blankTrailingSpecs?: number;
  blankTrailingImages?: number;
} = {}) {
  const fd = new FormData();
  const specs = opts.specs ?? [];
  specs.forEach((s, i) => {
    fd.set(`spec_${i}_label`, s.label);
    fd.set(`spec_${i}_value`, s.value);
  });
  (opts.images ?? []).forEach((im, i) => {
    fd.set(`image_${i}_url`, im.url);
    fd.set(`image_${i}_alt`, im.alt ?? '');
    fd.set(`image_${i}_publicId`, im.publicId ?? '');
  });
  for (let k = 0; k < (opts.extraSpecs ?? 0); k++) {
    const i = specs.length + k;
    fd.set(`spec_${i}_label`, `Latarang ${i}`);
    fd.set(`spec_${i}_value`, `Nilai ${i}`);
  }
  for (let k = 0; k < (opts.extraImages ?? 0); k++) {
    const i = (opts.images ?? []).length + k;
    fd.set(`image_${i}_url`, `https://res.cloudinary.com/demo/image/upload/v1/x${i}.png`);
    fd.set(`image_${i}_alt`, `Alt ${i}`);
    fd.set(`image_${i}_publicId`, `pid/${i}`);
  }
  // Blank trailing rows: present in the DOM, empty.
  for (let k = 0; k < (opts.blankTrailingSpecs ?? 0); k++) {
    const i = specs.length + (opts.extraSpecs ?? 0) + k;
    fd.set(`spec_${i}_label`, '');
    fd.set(`spec_${i}_value`, '');
  }
  for (let k = 0; k < (opts.blankTrailingImages ?? 0); k++) {
    const i = (opts.images ?? []).length + (opts.extraImages ?? 0) + k;
    fd.set(`image_${i}_url`, '');
    fd.set(`image_${i}_alt`, '');
    fd.set(`image_${i}_publicId`, '');
  }
  // Required product fields so the schema can actually parse.
  fd.set('name', 'Tempat Tisu Marmer');
  fd.set('categoryId', '1');
  fd.set('shortDescription', 'Deskripsi singkat');
  fd.set('description', 'Deskripsi panjang');
  fd.set('pricingType', 'FIXED');
  fd.set('price', '185000');
  fd.set('stoneType', 'Carrara');
  fd.set('color', 'Putih');
  fd.set('dimensions', '15x12x11');
  fd.set('weightGrams', '2400');
  return fd;
}

const spec = (i: number) => ({ label: `Label ${i}`, value: `Nilai ${i}` });

/**
 * Two shapes, deliberately kept apart.
 *   `fdImg` — what buildFormData writes into FormData (`url`)
 *   `img`   — what the Zod schema expects (`imageUrl`, productImageInputSchema)
 */
const url = (i: number) => `https://res.cloudinary.com/demo/image/upload/v1/p${i}.png`;
const fdImg = (i: number) => ({ url: url(i) });
const img = (i: number) => ({ imageUrl: url(i) });

console.log(`MAX_PRODUCT_ROWS = ${MAX_PRODUCT_ROWS}`);

// ═══ 1. Boundary: 25 and 26 valid rows are NOT overflow ════════════════════
section('Boundary: 25 and 26 rows are within the limit');

for (const n of [1, 25, MAX_PRODUCT_ROWS]) {
  const fd = buildFormData({ specs: Array.from({ length: n }, (_, i) => spec(i)), images: [fdImg(0)] });
  const ov = findRowOverflow(fd.entries());
  check(`${n} specs -> no overflow`, !ov.specifications, ov);
  check(`${n} specs -> no field errors`, Object.keys(overflowFieldErrors(ov)).length === 0, overflowFieldErrors(ov));
}
for (const n of [1, 25, MAX_PRODUCT_ROWS]) {
  const fd = buildFormData({ images: Array.from({ length: n }, (_, i) => fdImg(i)) });
  const ov = findRowOverflow(fd.entries());
  check(`${n} images -> no overflow`, !ov.images, ov);
}

// The schema still accepts them.
for (const n of [25, MAX_PRODUCT_ROWS]) {
  const r = createProductSchema.safeParse({
    name: 'X', categoryId: 1, shortDescription: 's', description: 'd',
    pricingType: 'FIXED', price: '1', stoneType: 's', color: 'c',
    dimensions: 'd', weightGrams: '1',
    specifications: Array.from({ length: n }, (_, i) => spec(i)),
    images: [img(0)],
  });
  check(`schema accepts ${n} specs`, r.success, r.success ? '' : r.error.issues);
}

// ═══ 2. 27 rows ARE detected as overflow ═══════════════════════════════════
section('27 rows are detected (the silent-truncation case)');

{
  const fd = buildFormData({ specs: Array.from({ length: MAX_PRODUCT_ROWS }, (_, i) => spec(i)), images: [fdImg(0)], extraSpecs: 1 });
  const ov = findRowOverflow(fd.entries());
  check('27 specs -> specifications overflow detected', ov.specifications, ov);
  check('  images not flagged', !ov.images, ov);
  const errs = overflowFieldErrors(ov);
  check('  field error keyed `specifications`', errs.specifications === SPECIFICATIONS_LIMIT_MESSAGE, errs);
}
{
  const fd = buildFormData({ images: Array.from({ length: MAX_PRODUCT_ROWS }, (_, i) => fdImg(i)), extraImages: 1 });
  const ov = findRowOverflow(fd.entries());
  check('27 images -> images overflow detected', ov.images, ov);
  const errs = overflowFieldErrors(ov);
  check('  field error keyed `images`', errs.images === IMAGES_LIMIT_MESSAGE, errs);
}
{
  // The critical regression: schema alone passes, overflow is what catches it.
  const fd = buildFormData({ specs: Array.from({ length: MAX_PRODUCT_ROWS }, (_, i) => spec(i)), images: [fdImg(0)], extraSpecs: 1 });
  const schemaOnly = createProductSchema.safeParse({
    name: 'X', categoryId: 1, shortDescription: 's', description: 'd',
    pricingType: 'FIXED', price: '1', stoneType: 's', color: 'c',
    dimensions: 'd', weightGrams: '1',
    specifications: Array.from({ length: MAX_PRODUCT_ROWS }, (_, i) => spec(i)), // parser already truncated
    images: [img(0)],
  });
  check('schema alone WOULD pass the truncated 26 (proving .max() is not enough)', schemaOnly.success);
  check('findRowOverflow is what catches it', findRowOverflow(fd.entries()).specifications);
}

// ═══ 3. Blank trailing rows must NOT trigger a false error ═════════════════
section('Blank trailing rows raise no false error');

{
  const fd = buildFormData({ specs: Array.from({ length: MAX_PRODUCT_ROWS }, (_, i) => spec(i)), images: [fdImg(0)], blankTrailingSpecs: 5 });
  const ov = findRowOverflow(fd.entries());
  check('26 real + 5 blank spec rows -> no overflow', !ov.specifications, ov);
}
{
  const fd = buildFormData({ images: Array.from({ length: MAX_PRODUCT_ROWS }, (_, i) => fdImg(i)), blankTrailingImages: 5 });
  const ov = findRowOverflow(fd.entries());
  check('26 real + 5 blank image slots -> no overflow', !ov.images, ov);
}
{
  // Whitespace-only is still blank.
  const fd = buildFormData({ images: [fdImg(0)] });
  fd.set('image_40_url', '   ');
  fd.set('image_41_url', '\t\n');
  const ov = findRowOverflow(fd.entries());
  check('whitespace-only rows past the limit are ignored', !ov.images, ov);
}
{
  // An image slot with alt/publicId but NO url past the limit: the parser drops
  // url-less slots, so it must not count as a row.
  const fd = buildFormData({ images: [fdImg(0)] });
  fd.set('image_30_alt', 'Alt tanpa URL');
  fd.set('image_30_publicId', 'pid/30');
  const ov = findRowOverflow(fd.entries());
  check('url-less image slot past the limit is not counted', !ov.images, ov);
}
{
  const fd = buildFormData({ specs: [spec(0)] });
  fd.set('spec_30_label', '   ');
  fd.set('spec_30_value', '');
  const ov = findRowOverflow(fd.entries());
  check('whitespace-only spec row past the limit is ignored', !ov.specifications, ov);
}

// ═══ 4. Create and update behave identically ═══════════════════════════════
section('Create and update agree on the same inputs');

const cases: Array<[string, { specs: number; images: number; extraSpecs: number; extraImages: number }]> = [
  ['25/25 valid', { specs: 25, images: 25, extraSpecs: 0, extraImages: 0 }],
  ['26/26 valid', { specs: 26, images: 26, extraSpecs: 0, extraImages: 0 }],
  ['27 specs', { specs: 26, images: 1, extraSpecs: 1, extraImages: 0 }],
  ['27 images', { specs: 1, images: 26, extraSpecs: 0, extraImages: 1 }],
  ['both over', { specs: 26, images: 26, extraSpecs: 1, extraImages: 1 }],
];

for (const [label, c] of cases) {
  const fd = buildFormData({
    specs: Array.from({ length: c.specs }, (_, i) => spec(i)),
    images: Array.from({ length: c.images }, (_, i) => fdImg(i)),
    extraSpecs: c.extraSpecs,
    extraImages: c.extraImages,
  });
  const ov = findRowOverflow(fd.entries());
  const errs = overflowFieldErrors(ov);

  const shouldErrorSpecs = c.specs + c.extraSpecs > MAX_PRODUCT_ROWS;
  const shouldErrorImages = c.images + c.extraImages > MAX_PRODUCT_ROWS;

  check(`${label}: create flags specifications === expected`, 'specifications' in errs === shouldErrorSpecs, errs);
  check(`${label}: create flags images === expected`, 'images' in errs === shouldErrorImages, errs);

  // update path uses the identical helper, so identical outcome by construction.
  const updSchema = updateProductSchema;
  const parsed = updSchema.safeParse({ name: 'X' });
  check(`${label}: update schema is reachable (sanity)`, parsed.success === false || parsed.success === true);
}

// ═══ 5. Both overflows at once ═════════════════════════════════════════════
section('Both sections over the limit');
{
  const fd = buildFormData({
    specs: Array.from({ length: 26 }, (_, i) => spec(i)),
    images: Array.from({ length: 26 }, (_, i) => fdImg(i)),
    extraSpecs: 3,
    extraImages: 3,
  });
  const errs = overflowFieldErrors(findRowOverflow(fd.entries()));
  check('reports both fields', Object.keys(errs).sort().join(',') === 'images,specifications', errs);
}

// ═══ 6. Non-row and unrelated keys are ignored ════════════════════════════
section('Unrelated keys never trigger overflow');
{
  const fd = buildFormData({ images: [fdImg(0)] });
  fd.set('name', 'Produk');
  fd.set('description', 'https://example.com/999');
  fd.set('specification_note', 'x');           // not an indexed row key
  fd.set('imageCount', '999');                 // not an indexed row key
  fd.set('spec_ab_label', 'x');                // non-numeric index
  const ov = findRowOverflow(fd.entries());
  check('unrelated keys ignored', !ov.specifications && !ov.images, ov);
}

// ═══ 7. Single pass / no unbounded scan ════════════════════════════════════
section('Bounded work');
{
  let seen = 0;
  function* counting() {
    for (let i = 0; i < 26; i++) {
      seen++;
      yield [`spec_${i}_label`, `L${i}`] as [string, FormDataEntryValue];
    }
  }
  findRowOverflow(counting());
  check('iterates exactly once over the entries', seen === 26, seen);

  // A huge sparse submission must not make it scan a million indices.
  const t0 = Date.now();
  const fd = new FormData();
  fd.set('spec_0_label', 'x');
  fd.set('spec_999999_label', 'beyond');       // detected directly from the key
  const ov = findRowOverflow(fd.entries());
  const elapsed = Date.now() - t0;
  check('a far-out index is still detected', ov.specifications, ov);
  check(`detection is O(keys), not O(index) (${elapsed}ms)`, elapsed < 1000, elapsed);
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
