/**
 * Directed tests for the Phase 3 validation fixes.
 *
 *   1. Product array bounds: 0 / 1 / 25 / 26 specifications, and images.
 *   2. Category URL validation: https, http, root-relative, malformed,
 *      javascript:, protocol-relative.
 *   3. Create AND update schemas both enforce the bounds.
 *
 * Schema-level only - no database, no server actions. Run with:
 *   npx tsx test-validation.mts
 */
import {
  createProductSchema,
  updateProductSchema,
  MAX_PRODUCT_ROWS,
} from './lib/validation/product';
import { createCategorySchema, updateCategorySchema } from './lib/validation/category';
import { isAllowedMediaUrl } from './lib/validation/media-url';

let failures = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  if (cond) console.log(`  PASS  ${label}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${label}`, detail ?? '');
  }
}

function section(title: string) {
  console.log(`\n--- ${title} ---`);
}

/** A minimal valid product payload; override fields per case. */
function productPayload(over: Record<string, unknown> = {}) {
  return {
    name: 'Tempat Tisu Marmer Carrara',
    categoryId: 1,
    shortDescription: 'Tempat tisu marble',
    description: 'Deskripsi produk.',
    pricingType: 'FIXED',
    price: '185000',
    stoneType: 'Carrara',
    color: 'Putih',
    dimensions: '15x12x11 cm',
    weightGrams: '2400',
    ...over,
  };
}

const spec = (i: number) => ({ label: `Label ${i}`, value: `Nilai ${i}` });
const img = (i: number) => ({
  imageUrl: `https://res.cloudinary.com/demo/image/upload/v1/p${i}.png`,
  altText: `Alt ${i}`,
});

// ═══ 1. Specification array bounds ═══════════════════════════════════════════
section('Specifications: 0 / 1 / 25 / 26 rows');

for (const [label, n] of [
  ['0 rows', 0],
  ['1 row', 1],
  ['25 rows', 25],
  ['26 rows', 26],
] as const) {
  const r = createProductSchema.safeParse(
    productPayload({ specifications: Array.from({ length: n }, (_, i) => spec(i)), images: [img(0)] })
  );
  check(`create accepts ${label} (MAX=${MAX_PRODUCT_ROWS})`, r.success, r.success ? '' : r.error.issues);
  if (r.success) check(`  ${label} round-trips with ${r.data.specifications.length} rows`, r.data.specifications.length === n, r.data.specifications.length);
}

// 27 rows exceeds MAX_PRODUCT_ROWS=26 and must be a structured error.
{
  const r = createProductSchema.safeParse(
    productPayload({ specifications: Array.from({ length: 27 }, (_, i) => spec(i)), images: [img(0)] })
  );
  check('create REJECTS 27 specifications', !r.success, 'accepted!');
  if (!r.success) {
    const issue = r.error.issues.find((i) => i.path[0] === 'specifications');
    check('  error is on the `specifications` path', Boolean(issue), r.error.issues);
    check('  error mentions the maximum', /Maksimal 26/.test(issue?.message ?? ''), issue?.message);
    // Structured: flatten() must yield a usable field error for the form.
    const flat = r.error.flatten().fieldErrors.specifications;
    check('  flatten() produces a field error the form can render', Array.isArray(flat) && flat.length > 0, flat);
  }
}

// ═══ 2. Image array bounds ═══════════════════════════════════════════════════
section('Images: 0 / 1 / 25 / 26 slots');

for (const [label, n] of [
  ['0 images', 0],
  ['1 image', 1],
  ['25 images', 25],
  ['26 images', 26],
] as const) {
  const r = createProductSchema.safeParse(
    productPayload({ specifications: [], images: Array.from({ length: n }, (_, i) => img(i)) })
  );
  if (n === 0) {
    check(`create rejects ${label} (min 1 required)`, !r.success);
  } else {
    check(`create accepts ${label} (MAX=${MAX_PRODUCT_ROWS})`, r.success, r.success ? '' : r.error.issues);
    if (r.success) check(`  ${label} round-trips with ${r.data.images.length} images`, r.data.images.length === n, r.data.images.length);
  }
}

{
  const r = createProductSchema.safeParse(
    productPayload({ specifications: [], images: Array.from({ length: 27 }, (_, i) => img(i)) })
  );
  check('create REJECTS 27 images', !r.success, 'accepted!');
  if (!r.success) {
    const issue = r.error.issues.find((i) => i.path[0] === 'images');
    check('  error is on the `images` path', Boolean(issue), r.error.issues);
    check('  error mentions the maximum', /Maksimal 26/.test(issue?.message ?? ''), issue?.message);
  }
}

// ═══ 3. Update schema enforces the same bounds ═══════════════════════════════
section('Update schema uses the identical bounds');

{
  const ok = updateProductSchema.safeParse(
    productPayload({ specifications: Array.from({ length: 26 }, (_, i) => spec(i)), images: [img(0)] })
  );
  check('update accepts 26 specifications', ok.success, ok.success ? '' : ok.error.issues);

  const tooMany = updateProductSchema.safeParse(
    productPayload({ specifications: Array.from({ length: 27 }, (_, i) => spec(i)), images: [img(0)] })
  );
  check('update REJECTS 27 specifications', !tooMany.success, 'accepted!');

  const tooManyImages = updateProductSchema.safeParse(
    productPayload({ specifications: [], images: Array.from({ length: 27 }, (_, i) => img(i)) })
  );
  check('update REJECTS 27 images', !tooManyImages.success, 'accepted!');
}

// ═══ 4. Defaults and valid data preserved ════════════════════════════════════
section('Defaults and existing valid data are unchanged');

{
  // specifications omitted entirely -> default [] must survive.
  const r = createProductSchema.safeParse(productPayload({ images: [img(0)] }));
  check('omitted specifications still default to []', r.success && r.data.specifications.length === 0, r.success ? r.data.specifications : r.error.issues);
}
{
  const r = createProductSchema.safeParse(productPayload({ images: [img(0)] }));
  check('isAvailable still defaults to true', r.success && r.data.isAvailable === true, r.success ? r.data.isAvailable : null);
  check('isUniquePiece still defaults to false', r.success && r.data.isUniquePiece === false);
  check('whatsappEnabled still defaults to true', r.success && r.data.whatsappEnabled === true);
  check('isFeatured still defaults to false', r.success && r.data.isFeatured === false);
}
{
  const r = createProductSchema.safeParse(productPayload({ images: [img(0)], material: '   ', shopeeUrl: '  ' }));
  check('blank optional material -> undefined', r.success && r.data.material === undefined, r.success ? r.data.material : r.error.issues);
  check('blank optional shopeeUrl -> undefined', r.success && r.data.shopeeUrl === undefined, r.success ? r.data.shopeeUrl : r.error.issues);
}
{
  // A relative product image path must still be accepted.
  const r = createProductSchema.safeParse(
    productPayload({ images: [{ imageUrl: '/images/local.webp', altText: '' }] })
  );
  check('root-relative product image still accepted', r.success, r.success ? '' : r.error.issues);
}

// ═══ 5. Category URL validation ═════════════════════════════════════════════
section('Category imageUrl');

const URL_CASES: Array<[string, string, boolean]> = [
  ['valid https Cloudinary', 'https://res.cloudinary.com/demo/image/upload/v1/a.png', true],
  ['valid http', 'http://example.com/a.png', true],
  ['valid root-relative', '/images/hero.webp', true],
  ['valid deep root-relative', '/images/nested/deep.webp', true],
  ['malformed http:// (no host)', 'http://', false],
  ['malformed https:// (no host)', 'https://', false],
  ['javascript: scheme', 'javascript:alert(1)', false],
  ['JavaScript: mixed case', 'JavaScript:alert(1)', false],
  ['protocol-relative', '//example.com/a.png', false],
  ['protocol-relative bare host', '//example.com', false],
  ['data: scheme', 'data:image/png;base64,AAAA', false],
  ['ftp: scheme', 'ftp://example.com/a.png', false],
  ['file: scheme', 'file:///etc/passwd', false],
  ['not a url at all', 'nonsense', false],
];

for (const [label, value, expected] of URL_CASES) {
  const r = createCategorySchema.safeParse({ name: 'Kategori Uji', imageUrl: value });
  check(`create ${expected ? 'accepts' : 'rejects'} ${label}`, r.success === expected, r.success ? '' : r.error.issues[0]?.message);
}

section('Category update schema (same validator)');
for (const [label, value, expected] of URL_CASES) {
  const r = updateCategorySchema.safeParse({ name: 'Kategori Uji', imageUrl: value, isActive: true });
  check(`update ${expected ? 'accepts' : 'rejects'} ${label}`, r.success === expected, r.success ? '' : r.error.issues[0]?.message);
}

section('Category: existing behaviour preserved');
{
  const r = createCategorySchema.safeParse({ name: 'Marmer', imageUrl: '' });
  check('blank imageUrl still -> undefined (optional)', r.success && r.data.imageUrl === undefined, r.success ? r.data.imageUrl : r.error.issues);
}
{
  const r = createCategorySchema.safeParse({ name: 'Marmer' });
  check('omitted imageUrl still valid', r.success, r.success ? '' : r.error.issues);
}
{
  const r = createCategorySchema.safeParse({ name: 'Marmer', imageUrl: `https://res.cloudinary.com/${'a'.repeat(501)}` });
  check('over-long URL still rejected', !r.success);
}
{
  const r = createCategorySchema.safeParse({ name: 'Marmer', imageUrl: '  https://example.com/a.png  ' });
  check('whitespace-padded https URL is trimmed and accepted', r.success, r.success ? '' : r.error.issues);
  if (r.success) check('  trimmed value stored without spaces', r.data.imageUrl === 'https://example.com/a.png', r.data.imageUrl);
}
{
  // The real production Cloudinary URL from the seeded data must still validate.
  const real =
    'https://res.cloudinary.com/std3x7lf/image/upload/v1791528840/studio-marmer/products/r6dsvrbqlkxor1kl7glq.png';
  const r = createCategorySchema.safeParse({ name: 'Marmer', imageUrl: real });
  check('real Cloudinary URL still accepted', r.success, r.success ? '' : r.error.issues);
  check('  helper agrees', isAllowedMediaUrl(real));
}

// ═══ 6. Direct helper contract ══════════════════════════════════════════════
section('isAllowedMediaUrl helper');
for (const [label, value, expected] of URL_CASES) {
  check(`helper ${expected ? 'allows' : 'rejects'} ${label}`, isAllowedMediaUrl(value) === expected, value);
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
