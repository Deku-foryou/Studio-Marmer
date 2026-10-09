/**
 * Deterministic, idempotent database seed.
 *
 * Scope:
 *  - the site settings singleton row
 *  - the optional admin account
 *
 * WHAT THIS SEED DELIBERATELY DOES NOT CREATE
 * Studio Marmer has no confirmed catalog yet. Earlier versions of this file
 * seeded a set of fictional marble products (and a set of sample categories)
 * purely so the storefront had something to render during development. Those
 * records were never the client's data: they carried invented names, prices,
 * descriptions and image references, and the storefront displayed them as if
 * they were real stock. Presenting fiction as inventory is worse than an empty
 * shop, so they have been removed rather than replaced.
 *
 * As a result this seed now creates NO products and NO categories. The catalog
 * and the category taxonomy are client-owned content:
 *  - categories are created in the admin area (Category model + CRUD intact)
 *  - products are created in the admin area and their images are uploaded
 *    through Cloudinary
 *
 * The storefront is built to render an empty catalog cleanly - see the empty
 * states in components/product/ProductGrid.tsx and
 * components/sections/CategoriesSection.tsx.
 *
 * Re-running this script is safe: the settings row is upserted with `update: {}`
 * (so it never overwrites values an admin has edited) and the admin user is
 * created only when absent (an existing admin's password is never overwritten).
 */

import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../lib/db/password';

const prisma = new PrismaClient();

/**
 * Site settings singleton (id = 1).
 *
 * Everything except `siteName` is left null on purpose: those channels are the
 * client's to fill in, and the storefront hides any link it cannot resolve, so
 * an unconfigured value never renders as a broken or invented CTA. The media
 * columns stay null too, which is the safe default rather than a gap: no logo
 * falls back to the text wordmark, and no hero image falls back to the bundled
 * static photograph.
 *
 * `update: {}` means re-seeding never overwrites values an admin has edited.
 */
const SITE_SETTINGS = {
  id: 1,
  siteName: 'Studio Marmer',
  logoUrl: null,
  logoPublicId: null,
  whatsappNumber: null,
  shopeeUrl: null,
  instagramUrl: null,
  tiktokUrl: null,
  email: null,
  address: null,
  heroTitle: null,
  heroSubtitle: null,
  heroImageUrl: null,
  heroImagePublicId: null,
} as const;

async function seedSiteSettings(): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { id: SITE_SETTINGS.id },
    update: {},
    create: { ...SITE_SETTINGS },
  });

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

async function main(): Promise<void> {
  console.log('Seeding database...');

  await seedSiteSettings();
  await seedAdminUser();

  const [productCount, categoryCount, imageCount] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.productImage.count(),
  ]);

  console.log('');
  console.log('Products:             ' + productCount);
  console.log('Categories:           ' + categoryCount);
  console.log('Product images:       ' + imageCount);
  console.log('');
  console.log('NOTE: this seed creates no demo content by design.');
  console.log('Products and categories are added through the admin area;');
  console.log('product images are uploaded to Cloudinary from there.');
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