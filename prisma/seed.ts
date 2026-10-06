/**
 * Deterministic, idempotent database seed.
 *
 * Scope: schema reference data + the optional admin account ONLY.
 *
 * Products are intentionally NOT seeded. The only product dataset that exists
 * today is `data/products.ts`, which contains consumer electronics (Sony,
 * Apple, Samsung, ...). Re-labelling those as marble craft items would invent
 * business data, so the marble catalog is left for the product-content phase.
 * `data/products.ts` is left untouched and remains the live catalog source.
 *
 * Re-running this script is safe: categories and site settings are upserted,
 * and the admin user is created only when absent (an existing admin's password
 * is never overwritten).
 */

import { PrismaClient, Role } from '@prisma/client';
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

async function main(): Promise<void> {
  console.log('Seeding database...');

  await seedCategoriesAndSettings();
  await seedAdminUser();

  const productCount = await prisma.product.count();

  console.log('');
  console.log(
    `Products in database: ${productCount} (intentionally not seeded).`
  );
  console.log('Real marble products are added in the product-content phase.');
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
