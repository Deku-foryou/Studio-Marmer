/**
 * Deterministic, idempotent database seed.
 *
 * Scope:
 *  - structural reference data (categories, site settings)
 *  - the optional admin account
 *  - a small DUMMY marble development catalog
 *
 * The old consumer-electronics dataset in `data/products.ts` is intentionally
 * NOT converted into marble products - those records describe unrelated
 * products (Sony, Apple, Samsung, ...), so relabelling them would fabricate a
 * catalog. The dummy records below were written from scratch instead, and
 * `data/products.ts` remains untouched on disk.
 *
 * Re-running this script is safe: categories and site settings are upserted,
 * products are upserted on their unique `slug`, and the admin user is created
 * only when absent (an existing admin's password is never overwritten).
 */

import { Prisma, PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../lib/db/password';

const prisma = new PrismaClient();

/** Reference data owned by the seed. Safe to re-apply. */
const CATEGORIES = [
  {
    name: 'Vases',
    slug: 'vases',
    description: 'Hand-finished marble vessels and sculptural vases.',
    sortOrder: 10,
  },
  {
    name: 'Coasters',
    slug: 'coasters',
    description: 'Marble coaster sets and small tabletop pieces.',
    sortOrder: 20,
  },
  {
    name: 'Trays',
    slug: 'trays',
    description: 'Marble serving trays, catchalls and organiser trays.',
    sortOrder: 30,
  },
  {
    name: 'Tables',
    slug: 'tables',
    description: 'Side tables, console tables and marble-topped surfaces.',
    sortOrder: 40,
  },
  {
    name: 'Sculptures',
    slug: 'sculptures',
    description: 'Carved and polished marble decorative objects.',
    sortOrder: 50,
  },
  {
    name: 'Decor',
    slug: 'decor',
    description: 'Accent pieces, bookends, candle holders and ornaments.',
    sortOrder: 60,
  },
] as const;

/**
 * Site settings singleton (id = 1).
 * `update: {}` means re-seeding never overwrites values an admin has edited.
 */
const SITE_SETTINGS = {
  id: 1,
  siteName: 'Marble Craft Store',
  logoUrl: null,
  whatsappNumber: null,
  shopeeUrl: null,
  instagramUrl: null,
  tiktokUrl: null,
  email: null,
  address: null,
  heroTitle: null,
  heroSubtitle: null,
} as const;

async function seedCategoriesAndSettings(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const category of CATEGORIES) {
      await tx.category.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          description: category.description,
          sortOrder: category.sortOrder,
        },
        create: {
          name: category.name,
          slug: category.slug,
          description: category.description,
          sortOrder: category.sortOrder,
        },
      });
    }

    await tx.siteSettings.upsert({
      where: { id: SITE_SETTINGS.id },
      update: {},
      create: { ...SITE_SETTINGS },
    });
  });

  console.log(`  categories:     ${CATEGORIES.length} ensured`);
  console.log('  site_settings:  1 row ensured');
}

async function seedAdminUser(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || 'Store Admin';

  if (!email || !password) {
    console.log(
      '  admin user:     skipped (SEED_ADMIN_EMAIL and/or SEED_ADMIN_PASSWORD not set)'
    );
    return;
  }

  // Normalise to match the case-insensitive unique index.
  const normalisedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalisedEmail },
    select: { id: true },
  });

  if (existing) {
    console.log(
      `  admin user:     already present (${normalisedEmail}) - left untouched`
    );
    return;
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      name,
      email: normalisedEmail,
      passwordHash,
      role: Role.ADMIN,
    },
  });

  // The password is deliberately never logged.
  console.log(`  admin user:     created (${normalisedEmail})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// DUMMY DEVELOPMENT CATALOG
//
// IMPORTANT: the marble product records below are FICTIONAL placeholders for
// local development and testing only. Studio Marmer does not yet have real
// product data, so nothing here represents an actual item, price, or listing.
//
// The old consumer-electronics dataset that used to live in data/products.ts
// was deliberately NOT converted into marble products - that would have
// invented a catalog from unrelated demo data. These records are original
// placeholders written from scratch instead.
//
// To replace them with real data later, delete the rows by slug (or delete the
// DUMMY_PRODUCTS array and the products will simply stop being re-created).
//
// All image URLs point at locally generated placeholder assets in
// public/placeholders/. No third-party or copyrighted imagery is referenced.
// ─────────────────────────────────────────────────────────────────────────────

const CARRARA = '/placeholders/marble-carrara.png';
const TRAVERTINE = '/placeholders/marble-travertine.png';
const NERO = '/placeholders/marble-nero-marquina.png';
const VERDE = '/placeholders/marble-verde-luisa.png';
const ROSSO = '/placeholders/marble-rosso-levanto.png';

/** Clearly-fake Shopee links. Not real storefronts. */
const DUMMY_SHOPEE =
  'https://shopee.co.id/placeholder-studio-marmer-dummy-listing';

type DummyProduct = {
  slug: string;
  name: string;
  categorySlug: string;
  shortDescription: string;
  description: string;
  price: string;
  originalPrice: string | null;
  pricingType: 'FIXED' | 'STARTING_FROM';
  material: string | null;
  stoneType: string;
  dimensions: string;
  weightGrams: number;
  color: string;
  specifications: { label: string; value: string }[];
  craftingTime: string | null;
  isAvailable: boolean;
  isUniquePiece: boolean;
  shopeeUrl: string | null;
  whatsappEnabled: boolean;
  isFeatured: boolean;
  images: { imageUrl: string; altText: string; sortOrder: number }[];
};

const DUMMY_PRODUCTS: readonly DummyProduct[] = [
  {
    slug: 'dummy-tempat-tisu-marmer-carrara',
    name: 'Tempat Tisu Marmer Carrara',
    categorySlug: 'decor',
    shortDescription:
      'Dummy record: tissue holder cut from Carrara-style marble with a soft honed finish.',
    description:
      'DEVELOPMENT PLACEHOLDER - not a real product. A rectangular marble tissue-box cover with a softened edge profile, intended to demonstrate the detail page layout, specification grid and pricing display. All specifications are illustrative only.',
    price: '185000.00',
    originalPrice: '215000.00',
    pricingType: 'FIXED',
    material: 'Marmer Carrara',
    stoneType: 'Carrara',
    dimensions: '15 x 12 x 11 cm',
    weightGrams: 2400,
    color: 'Putih abu-abu',
    specifications: [
      { label: 'Bahan', value: 'Marmer Carrara' },
      { label: 'Finishing', value: 'Honed' },
      { label: 'Ukuran', value: '15 x 12 x 11 cm' },
      { label: 'Berat', value: '2400 gram' },
    ],
    craftingTime: '5-7 hari kerja',
    isAvailable: true,
    isUniquePiece: false,
    shopeeUrl: DUMMY_SHOPEE,
    whatsappEnabled: true,
    isFeatured: true,
    images: [
      {
        imageUrl: CARRARA,
        altText: 'Placeholder image: marble tissue holder (dummy data)',
        sortOrder: 0,
      },
    ],
  },
  {
    slug: 'dummy-tempat-sabun-marmer-travertine',
    name: 'Tempat Sabun Marmer Travertine',
    categorySlug: 'decor',
    shortDescription:
      'Dummy record: travertine soap dish with a shallow carved drainage channel.',
    description:
      'DEVELOPMENT PLACEHOLDER - not a real product. A shallow oval soap dish used here to exercise a second stone type and a non-featured listing. Illustrative measurements only.',
    price: '95000.00',
    originalPrice: null,
    pricingType: 'FIXED',
    material: 'Marmer Travertine',
    stoneType: 'Travertine',
    dimensions: '14 x 10 x 2.5 cm',
    weightGrams: 850,
    color: 'Krem',
    specifications: [
      { label: 'Bahan', value: 'Marmer Travertine' },
      { label: 'Finishing', value: 'Filled + Honed' },
      { label: 'Ukuran', value: '14 x 10 x 2.5 cm' },
    ],
    craftingTime: '3-5 hari kerja',
    isAvailable: true,
    isUniquePiece: false,
    shopeeUrl: DUMMY_SHOPEE,
    whatsappEnabled: true,
    isFeatured: false,
    images: [
      {
        imageUrl: TRAVERTINE,
        altText: 'Placeholder image: travertine soap dish (dummy data)',
        sortOrder: 0,
      },
    ],
  },
  {
    slug: 'dummy-holder-hp-marmer-nero',
    name: 'Holder HP Marmer Nero',
    categorySlug: 'decor',
    shortDescription:
      'Dummy record: dark Nero Marquina phone stand, used to show high-contrast photography.',
    description:
      'DEVELOPMENT PLACEHOLDER - not a real product. An angled phone stand in a dark stone, present in the catalog so a dark-toned placeholder image is exercised. Not sold, not priced for real.',
    price: '120000.00',
    originalPrice: '150000.00',
    pricingType: 'STARTING_FROM',
    material: 'Marmer Nero Marquina',
    stoneType: 'Nero Marquina',
    dimensions: '10 x 8 x 9 cm',
    weightGrams: 1100,
    color: 'Hitam',
    specifications: [
      { label: 'Bahan', value: 'Marmer Nero Marquina' },
      { label: 'Finishing', value: 'Polished' },
      { label: 'Kemiringan', value: 'Bergaya tangan' },
    ],
    craftingTime: '7-10 hari kerja',
    isAvailable: true,
    isUniquePiece: true,
    shopeeUrl: null,
    whatsappEnabled: true,
    isFeatured: true,
    images: [
      {
        imageUrl: NERO,
        altText: 'Placeholder image: dark marble phone stand (dummy data)',
        sortOrder: 0,
      },
    ],
  },
  {
    slug: 'dummy-vas-marmer-minimalis',
    name: 'Vas Marmer Minimalis',
    categorySlug: 'vases',
    shortDescription:
      'Dummy record: minimal cylindrical vase demonstrating a STARTING_FROM price.',
    description:
      'DEVELOPMENT PLACEHOLDER - not a real product. A minimal cylindrical vase whose price uses the STARTING_FROM pricing type, so the "mulai dari" rendering path is covered by seed data rather than by production content.',
    price: '450000.00',
    originalPrice: '520000.00',
    pricingType: 'STARTING_FROM',
    material: 'Marmer Verde Luisa',
    stoneType: 'Verde Luisa',
    dimensions: '18 diameter x 26 tinggi cm',
    weightGrams: 4200,
    color: 'Hijau muda',
    specifications: [
      { label: 'Bahan', value: 'Marmer Verde Luisa' },
      { label: 'Finishing', value: 'Honed' },
      { label: 'Tinggi', value: '26 cm' },
      { label: 'Diameter', value: '18 cm' },
    ],
    craftingTime: '2-3 minggu',
    isAvailable: true,
    isUniquePiece: true,
    shopeeUrl: DUMMY_SHOPEE,
    whatsappEnabled: true,
    isFeatured: true,
    images: [
      {
        imageUrl: VERDE,
        altText: 'Placeholder image: minimal marble vase (dummy data)',
        sortOrder: 0,
      },
    ],
  },
  {
    slug: 'dummy-tray-marmer-oval',
    name: 'Tray Marmer Oval',
    categorySlug: 'trays',
    shortDescription:
      'Dummy record: oval serving tray with a raised rim, used to cover the trays category.',
    description:
      'DEVELOPMENT PLACEHOLDER - not a real product. An oval tray included purely so the catalog contains at least one record in every seeded category during development.',
    price: '275000.00',
    originalPrice: null,
    pricingType: 'FIXED',
    material: 'Marmer Rosso Levanto',
    stoneType: 'Rosso Levanto',
    dimensions: '38 x 24 x 2 cm',
    weightGrams: 3100,
    color: 'Merah kecoklatan',
    specifications: [
      { label: 'Bahan', value: 'Marmer Rosso Levanto' },
      { label: 'Bentuk', value: 'Oval' },
      { label: 'Ukuran', value: '38 x 24 x 2 cm' },
    ],
    craftingTime: '10-14 hari kerja',
    isAvailable: true,
    isUniquePiece: false,
    shopeeUrl: DUMMY_SHOPEE,
    whatsappEnabled: true,
    isFeatured: false,
    images: [
      {
        imageUrl: ROSSO,
        altText: 'Placeholder image: oval marble tray (dummy data)',
        sortOrder: 0,
      },
    ],
  },
  {
    slug: 'dummy-coaster-marmer-set-4',
    name: 'Coaster Marmer Set 4',
    categorySlug: 'coasters',
    shortDescription:
      'Dummy record: a four-piece coaster set, the entry-level priced item in the catalog.',
    description:
      'DEVELOPMENT PLACEHOLDER - not a real product. A four-piece coaster set that also exists to prove the "one product, multiple image rows" code path by carrying two images.',
    price: '145000.00',
    originalPrice: '175000.00',
    pricingType: 'FIXED',
    material: 'Marmer Carrara',
    stoneType: 'Carrara',
    dimensions: '10 x 10 x 0.8 cm (per buah)',
    weightGrams: 1600,
    color: 'Putih',
    specifications: [
      { label: 'Isi', value: '4 buah' },
      { label: 'Bahan', value: 'Marmer Carrara' },
      { label: 'Ukuran', value: '10 x 10 x 0.8 cm' },
    ],
    craftingTime: '4-6 hari kerja',
    isAvailable: true,
    isUniquePiece: false,
    shopeeUrl: DUMMY_SHOPEE,
    whatsappEnabled: true,
    isFeatured: false,
    images: [
      {
        imageUrl: CARRARA,
        altText: 'Placeholder image: marble coaster set (dummy data)',
        sortOrder: 0,
      },
      {
        imageUrl: TRAVERTINE,
        altText: 'Placeholder image: marble coaster set, alternate angle (dummy data)',
        sortOrder: 1,
      },
    ],
  },
  {
    slug: 'dummy-tempat-lilin-marmer',
    name: 'Tempat Lilin Marmer',
    categorySlug: 'decor',
    shortDescription:
      'Dummy record: marble candle holder, included as an unavailable item for testing.',
    description:
      'DEVELOPMENT PLACEHOLDER - not a real product. Deliberately seeded as unavailable so the team can verify that the catalog listing correctly hides unavailable products and that "Sold Out" rendering still works when reached directly.',
    price: '165000.00',
    originalPrice: null,
    pricingType: 'FIXED',
    material: 'Marmer Travertine',
    stoneType: 'Travertine',
    dimensions: '12 x 12 x 3 cm',
    weightGrams: 900,
    color: 'Krem',
    specifications: [
      { label: 'Bahan', value: 'Marmer Travertine' },
      { label: 'Diameter lubang', value: '2.2 cm' },
    ],
    craftingTime: '3-5 hari kerja',
    isAvailable: false,
    isUniquePiece: false,
    shopeeUrl: null,
    whatsappEnabled: false,
    isFeatured: false,
    images: [
      {
        imageUrl: TRAVERTINE,
        altText: 'Placeholder image: marble candle holder (dummy data)',
        sortOrder: 0,
      },
    ],
  },
  {
    slug: 'dummy-mangkok-marmer-dekoratif',
    name: 'Mangkok Marmer Dekoratif',
    categorySlug: 'decor',
    shortDescription:
      'Dummy record: decorative marble bowl with a matte outer surface.',
    description:
      'DEVELOPMENT PLACEHOLDER - not a real product. A decorative bowl used to cover a product with no originalPrice at all, verifying that the strike-through price block disappears cleanly.',
    price: '235000.00',
    originalPrice: null,
    pricingType: 'FIXED',
    material: 'Marmer Verde Luisa',
    stoneType: 'Verde Luisa',
    dimensions: '20 diameter x 8 tinggi cm',
    weightGrams: 1900,
    color: 'Hijau muda',
    specifications: [
      { label: 'Bahan', value: 'Marmer Verde Luisa' },
      { label: 'Finishing', value: 'Matte + Honed' },
      { label: 'Diameter', value: '20 cm' },
    ],
    craftingTime: '5-7 hari kerja',
    isAvailable: true,
    isUniquePiece: false,
    shopeeUrl: DUMMY_SHOPEE,
    whatsappEnabled: true,
    isFeatured: false,
    images: [
      {
        imageUrl: VERDE,
        altText: 'Placeholder image: decorative marble bowl (dummy data)',
        sortOrder: 0,
      },
    ],
  },
  {
    slug: 'dummy-asbak-marmer',
    name: 'Asbak Marmer',
    categorySlug: 'decor',
    shortDescription:
      'Dummy record: marble ashtray with a carved recess, the highest-priced seeded item.',
    description:
      'DEVELOPMENT PLACEHOLDER - not a real product. A carved ashtray that sits at the top of the seeded price range, useful for checking currency and number formatting at larger values.',
    price: '325000.00',
    originalPrice: '380000.00',
    pricingType: 'FIXED',
    material: 'Marmer Nero Marquina',
    stoneType: 'Nero Marquina',
    dimensions: '16 x 16 x 4 cm',
    weightGrams: 2600,
    color: 'Hitam',
    specifications: [
      { label: 'Bahan', value: 'Marmer Nero Marquina' },
      { label: 'Jumlah cekukan', value: '4' },
      { label: 'Ukuran', value: '16 x 16 x 4 cm' },
    ],
    craftingTime: '7-10 hari kerja',
    isAvailable: true,
    isUniquePiece: true,
    shopeeUrl: DUMMY_SHOPEE,
    whatsappEnabled: true,
    isFeatured: true,
    images: [
      {
        imageUrl: NERO,
        altText: 'Placeholder image: marble ashtray (dummy data)',
        sortOrder: 0,
      },
    ],
  },
  {
    slug: 'dummy-pot-mini-marmer',
    name: 'Pot Mini Marmer',
    categorySlug: 'vases',
    shortDescription:
      'Dummy record: small marble planter, the lowest-priced item in the catalog.',
    description:
      'DEVELOPMENT PLACEHOLDER - not a real product. A miniature planter at the bottom of the seeded price range. WhatsApp enquiry is disabled here so the per-product whatsappEnabled flag has a false case in development data.',
    price: '85000.00',
    originalPrice: null,
    pricingType: 'FIXED',
    material: 'Marmer Carrara',
    stoneType: 'Carrara',
    dimensions: '9 diameter x 9 tinggi cm',
    weightGrams: 700,
    color: 'Putih',
    specifications: [
      { label: 'Bahan', value: 'Marmer Carrara' },
      { label: 'Diameter', value: '9 cm' },
      { label: 'Tinggi', value: '9 cm' },
    ],
    craftingTime: '2-3 hari kerja',
    isAvailable: true,
    isUniquePiece: false,
    shopeeUrl: null,
    whatsappEnabled: false,
    isFeatured: false,
    images: [
      {
        imageUrl: CARRARA,
        altText: 'Placeholder image: miniature marble planter (dummy data)',
        sortOrder: 0,
      },
    ],
  },
];

/**
 * Upserts the dummy catalog. Deterministic: keyed on the unique `slug`, so
 * repeated runs update the same rows instead of creating duplicates.
 */
async function seedDummyProducts(): Promise<void> {
  const categories = await prisma.category.findMany({
    select: { id: true, slug: true },
  });
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  for (const item of DUMMY_PRODUCTS) {
    const categoryId = categoryIdBySlug.get(item.categorySlug);
    if (categoryId === undefined) {
      throw new Error(
        `Seed category "${item.categorySlug}" is missing. Run seedCategoriesAndSettings() first.`
      );
    }

    // `images` and `categorySlug` are seed-only fields, not Product columns.
    const { images, categorySlug: _seedCategorySlug, ...productColumns } = item;

    const price = new Prisma.Decimal(item.price);
    const originalPrice = item.originalPrice
      ? new Prisma.Decimal(item.originalPrice)
      : null;

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        ...productColumns,
        categoryId,
        price,
        originalPrice,
        specifications: item.specifications,
        pricingType: item.pricingType,
      },
      create: {
        ...productColumns,
        categoryId,
        price,
        originalPrice,
        specifications: item.specifications,
        pricingType: item.pricingType,
      },
    });

    // Images are replaced wholesale so re-running never accumulates duplicates.
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    if (images.length > 0) {
      await prisma.productImage.createMany({
        data: images.map((image) => ({ ...image, productId: product.id })),
      });
    }
  }

  console.log(`  dummy products: ${DUMMY_PRODUCTS.length} ensured (idempotent)`);
}

async function main(): Promise<void> {
  console.log('Seeding database...');

  await seedCategoriesAndSettings();
  await seedAdminUser();
  await seedDummyProducts();

  const [productCount, imageCount, featuredCount, unavailableCount] =
    await Promise.all([
      prisma.product.count(),
      prisma.productImage.count(),
      prisma.product.count({ where: { isFeatured: true } }),
      prisma.product.count({ where: { isAvailable: false } }),
    ]);

  console.log('');
  console.log(`Products seeded:        ${productCount}`);
  console.log(`Product images seeded:  ${imageCount}`);
  console.log(`Featured products:      ${featuredCount}`);
  console.log(`Unavailable (hidden):   ${unavailableCount}`);
  console.log('');
  console.log('NOTE: these are DUMMY development records, not real products.');
  console.log('Replace them with real Studio Marmer data in the content phase.');
  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
