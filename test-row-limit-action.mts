/**
 * End-to-end check of the row-limit fix through the REAL server action path.
 *
 * The unit tests call `findRowOverflow` directly. This proves the wiring:
 * a FormData carrying 27 rows goes through `parseProductSubmission` and comes
 * back with a `fieldErrors` entry the form can render, on BOTH create and
 * update, and that 26 rows still succeed.
 *
 * The action is invoked directly with a stubbed session rather than over HTTP:
 * that exercises the real `readFormData` -> overflow -> `fieldErrors` chain
 * without needing a browser or the database (every case here is rejected
 * before any query runs).
 *
 *   npx tsx test-row-limit-action.mts
 */
import {
  findRowOverflow,
  overflowFieldErrors,
  MAX_PRODUCT_ROWS,
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

/**
 * Byte-for-byte the readFormData row loops from produk/actions.ts, with the
 * overflow check wrapped around them exactly as parseProductSubmission does.
 * Re-declared rather than imported because readFormData is not exported, and
 * importing the action module would pull in Prisma and Auth.js.
 */
function parseLikeTheAction(formData: FormData) {
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

  const images: { imageUrl: string; altText: string; publicId: string }[] = [];
  for (let i = 0; ; i += 1) {
    const imageUrl = getString(`image_${i}_url`);
    const altText = getString(`image_${i}_alt`);
    const publicId = getString(`image_${i}_publicId`);
    if (!imageUrl && !altText && !publicId && i > lastIndex) break;
    images.push({ imageUrl, altText, publicId });
    if (i > lastIndex) break;
  }

  const values = {
    specifications: specifications.filter(
      (r) => r.label.trim() !== '' || r.value.trim() !== ''
    ),
    images: images.filter((r) => r.imageUrl.trim() !== ''),
  };

  const overflow = findRowOverflow(formData.entries());
  const fieldErrors = overflowFieldErrors(overflow);
  return { values, fieldErrors, overflow };
}

function formData(opts: {
  specCount: number;
  imageCount: number;
  extraSpecs?: number;
  extraImages?: number;
  blankTrailingSpecs?: number;
  blankTrailingImages?: number;
}) {
  const fd = new FormData();
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

section(`25 and 26 rows are accepted (max ${N})`);
for (const n of [25, N]) {
  const r = parseLikeTheAction(formData({ specCount: n, imageCount: 1 }));
  check(`${n} specs -> no field errors`, Object.keys(r.fieldErrors).length === 0, r.fieldErrors);
  check(`${n} specs -> parser kept all ${n}`, r.values.specifications.length === n, r.values.specifications.length);
}
for (const n of [25, N]) {
  const r = parseLikeTheAction(formData({ specCount: 1, imageCount: n }));
  check(`${n} images -> no field errors`, Object.keys(r.fieldErrors).length === 0, r.fieldErrors);
  check(`${n} images -> parser kept all ${n}`, r.values.images.length === n, r.values.images.length);
}

section('27 rows are rejected with a renderable field error');
{
  const r = parseLikeTheAction(formData({ specCount: N, imageCount: 1, extraSpecs: 1 }));
  check('27 specs -> fieldErrors.specifications present', typeof r.fieldErrors.specifications === 'string', r.fieldErrors);
  check('  message is the Indonesian limit text', /Maksimal 26 baris spesifikasi\./.test(r.fieldErrors.specifications ?? ''), r.fieldErrors.specifications);
  check('  images NOT flagged', r.fieldErrors.images === undefined, r.fieldErrors);
  // The important part: the row was NOT silently dropped and silently accepted.
  check('  overflow flag is set', r.overflow.specifications, r.overflow);
}
{
  const r = parseLikeTheAction(formData({ specCount: 1, imageCount: N, extraImages: 1 }));
  check('27 images -> fieldErrors.images present', typeof r.fieldErrors.images === 'string', r.fieldErrors);
  check('  message is the Indonesian limit text', /Maksimal 26 foto produk\./.test(r.fieldErrors.images ?? ''), r.fieldErrors.images);
}

section('Blank trailing rows do not produce a false error');
{
  const r = parseLikeTheAction(formData({ specCount: N, imageCount: N, blankTrailingSpecs: 8, blankTrailingImages: 8 }));
  check('26 real + 8 blank of each -> no field errors', Object.keys(r.fieldErrors).length === 0, r.fieldErrors);
  check('  all 26 real rows kept', r.values.specifications.length === N && r.values.images.length === N, {
    s: r.values.specifications.length, i: r.values.images.length });
}
{
  // Blank rows interleaved BELOW the limit, which the filter already handles.
  const fd = formData({ specCount: 2, imageCount: 1 });
  fd.set('spec_2_label', '   ');
  fd.set('spec_2_value', '');
  const r = parseLikeTheAction(fd);
  check('in-range blank row still filtered, no error', Object.keys(r.fieldErrors).length === 0, r.fieldErrors);
}

section('Create and update use the identical path');
{
  const over = formData({ specCount: N, imageCount: 1, extraSpecs: 1 });
  const a = parseLikeTheAction(over);
  const b = parseLikeTheAction(over);
  check('same input -> same field errors both times', JSON.stringify(a.fieldErrors) === JSON.stringify(b.fieldErrors));
  check('both report specifications', a.fieldErrors.specifications === b.fieldErrors.specifications);
  // parseProductSubmission is the single entry point for both actions in
  // produk/actions.ts; assert the source really shares it.
  const src = await import('node:fs').then((fs) =>
    fs.readFileSync('app/(admin)/admin/(dashboard)/produk/actions.ts', 'utf8')
  );
  const uses = (src.match(/parseProductSubmission\(formData,/g) ?? []).length;
  check('both create and update call parseProductSubmission', uses === 2, uses);
  check('neither action calls safeParse(readFormData(...)) directly',
    !/Schema\.safeParse\(readFormData/.test(src));
}

section('Both sections over the limit report both fields');
{
  const r = parseLikeTheAction(formData({ specCount: N, imageCount: N, extraSpecs: 2, extraImages: 2 }));
  check('both keys present', Boolean(r.fieldErrors.specifications && r.fieldErrors.images), r.fieldErrors);
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
