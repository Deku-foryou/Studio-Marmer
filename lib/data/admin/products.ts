/**
 * Admin data access layer for products — Server Component / server-action only.
 *
 * Mirrors the customer DAL's contract: Prisma `Decimal` never leaves this
 * module. Every value returned here is a plain JSON-safe primitive, so the data
 * can be passed to Client Components without further conversion.
 *
 * Server-only enforcement matches lib/data/products.ts: importing
 * `@/lib/db/prisma` pulls in `@prisma/client`, which cannot be bundled for the
 * browser, so a stray Client Component import fails the build. The guard below
 * is the explicit belt-and-braces check.
 */

if (typeof window !== 'undefined') {
  throw new Error(
    'lib/data/admin/products.ts is server-only and must not be imported by a Client Component.'
  );
}

import { prisma } from '@/lib/db/prisma';
import { slugify } from '@/lib/slug';

const PAGE_SIZE = 20;

// ─── Serialization ────────────────────────────────────────────────────────────

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const maybe = value as { toNumber: () => number };
    if (typeof maybe.toNumber === 'function') return maybe.toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalDecimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = decimalToNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Normalizes the loosely-typed `specifications` JSON column. */
function readSpecifications(value: unknown): { label: string; value: string }[] {
  if (!Array.isArray(value)) return [];
  const out: { label: string; value: string }[] = [];
  for (const entry of value) {
    if (entry && typeof entry === 'object') {
      const record = entry as Record<string, unknown>;
      if (typeof record.label === 'string' && typeof record.value === 'string') {
        out.push({ label: record.label, value: record.value });
      }
    }
  }
  return out;
}

// ─── Shapes ───────────────────────────────────────────────────────────────────

export type AdminProductRow = {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  categoryName: string;
  shortDescription: string;
  description: string;
  pricingType: 'FIXED' | 'STARTING_FROM';
  price: number;
  originalPrice: number | null;
  material: string | null;
  stoneType: string;
  color: string;
  dimensions: string;
  weightGrams: number;
  specifications: { label: string; value: string }[];
  craftingTime: string | null;
  isAvailable: boolean;
  isUniquePiece: boolean;
  shopeeUrl: string | null;
  whatsappEnabled: boolean;
  isFeatured: boolean;
  imageUrl: string | null;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
};

/** A product prepared for the create/edit form. */
export type AdminProductDetail = Omit<
  AdminProductRow,
  'imageUrl' | 'imageCount' | 'createdAt' | 'updatedAt'
> & {
  images: { imageUrl: string; altText: string | null }[];
};

export type AdminCategoryRow = {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
};

export type AdminProductFilters = {
  search?: string;
  categoryId?: number;
  availability?: 'all' | 'available' | 'unavailable';
  page?: number;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

const PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  categoryId: true,
  shortDescription: true,
  description: true,
  pricingType: true,
  price: true,
  originalPrice: true,
  material: true,
  stoneType: true,
  color: true,
  dimensions: true,
  weightGrams: true,
  specifications: true,
  craftingTime: true,
  isAvailable: true,
  isUniquePiece: true,
  shopeeUrl: true,
  whatsappEnabled: true,
  isFeatured: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { name: true } },
  images: {
    select: { imageUrl: true, altText: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
  },
} as const;

type ProductRecord = {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  shortDescription: string;
  description: string;
  pricingType: string;
  price: unknown;
  originalPrice: unknown;
  material: string | null;
  stoneType: string;
  color: string;
  dimensions: string;
  weightGrams: number;
  specifications: unknown;
  craftingTime: string | null;
  isAvailable: boolean;
  isUniquePiece: boolean;
  shopeeUrl: string | null;
  whatsappEnabled: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: { name: string };
  images: { imageUrl: string; altText: string | null; sortOrder: number }[];
};

function toAdminProductRow(record: ProductRecord): AdminProductRow {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    categoryId: record.categoryId,
    categoryName: record.category.name,
    shortDescription: record.shortDescription,
    description: record.description,
    pricingType: record.pricingType as 'FIXED' | 'STARTING_FROM',
    price: decimalToNumber(record.price),
    originalPrice: optionalDecimalToNumber(record.originalPrice),
    material: record.material,
    stoneType: record.stoneType,
    color: record.color,
    dimensions: record.dimensions,
    weightGrams: record.weightGrams,
    specifications: readSpecifications(record.specifications),
    craftingTime: record.craftingTime,
    isAvailable: record.isAvailable,
    isUniquePiece: record.isUniquePiece,
    shopeeUrl: record.shopeeUrl,
    whatsappEnabled: record.whatsappEnabled,
    isFeatured: record.isFeatured,
    imageUrl: record.images[0]?.imageUrl ?? null,
    imageCount: record.images.length,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/** Builds the Prisma `where` clause shared by the list and its count. */
function buildWhere(filters: AdminProductFilters) {
  const search = filters.search?.trim();

  const where: Record<string, unknown> = {};

  if (search) {
    // Case-insensitive contains on the fields an admin would search by.
    where.OR = [
      { name: { contains: search } },
      { slug: { contains: search } },
      { stoneType: { contains: search } },
    ];
  }

  if (filters.categoryId !== undefined) {
    where.categoryId = filters.categoryId;
  }

  if (filters.availability === 'available') {
    where.isAvailable = true;
  } else if (filters.availability === 'unavailable') {
    where.isAvailable = false;
  }

  return where;
}

/** One page of products plus the total count for pagination. */
export async function listAdminProducts(filters: AdminProductFilters): Promise<{
  products: AdminProductRow[];
  total: number;
  page: number;
  pageCount: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const where = buildWhere(filters);

  const [records, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: PRODUCT_SELECT,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: (records as ProductRecord[]).map(toAdminProductRow),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** Builds the edit-form payload directly, omitting list-only columns. */
function toAdminProductDetail(record: ProductRecord): AdminProductDetail {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    categoryId: record.categoryId,
    categoryName: record.category.name,
    shortDescription: record.shortDescription,
    description: record.description,
    pricingType: record.pricingType as 'FIXED' | 'STARTING_FROM',
    price: decimalToNumber(record.price),
    originalPrice: optionalDecimalToNumber(record.originalPrice),
    material: record.material,
    stoneType: record.stoneType,
    color: record.color,
    dimensions: record.dimensions,
    weightGrams: record.weightGrams,
    specifications: readSpecifications(record.specifications),
    craftingTime: record.craftingTime,
    isAvailable: record.isAvailable,
    isUniquePiece: record.isUniquePiece,
    shopeeUrl: record.shopeeUrl,
    whatsappEnabled: record.whatsappEnabled,
    isFeatured: record.isFeatured,
    images: record.images.map((image) => ({
      imageUrl: image.imageUrl,
      altText: image.altText,
    })),
  };
}

/** A single product for the edit form. Returns `null` when not found. */
export async function getAdminProductById(
  id: number
): Promise<AdminProductDetail | null> {
  const record = (await prisma.product.findUnique({
    where: { id },
    select: PRODUCT_SELECT,
  })) as ProductRecord | null;

  return record ? toAdminProductDetail(record) : null;
}

/** Every category, for the category selector. */
export async function getAdminCategories(): Promise<AdminCategoryRow[]> {
  const rows = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return rows;
}

/** Verifies the selected category actually exists. */
export async function categoryExists(id: number): Promise<boolean> {
  const found = await prisma.category.findUnique({
    where: { id },
    select: { id: true },
  });
  return found !== null;
}

/**
 * Returns a slug that is unique across `products`.
 *
 * Deterministic: the same name always resolves to the same base, and
 * collisions are resolved by appending `-2`, `-3`, ... in ascending numeric
 * order. No random component is used, so slugs stay predictable and
 * human-readable. When `excludeId` is supplied the product being edited is
 * ignored, so re-saving it keeps its own slug.
 */
export async function resolveUniqueSlug(
  name: string,
  excludeId?: number
): Promise<string> {
  const base = slugify(name) || 'produk';

  const existing = await prisma.product.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true, id: true },
  });

  const taken = new Set(
    existing
      .filter((row) => row.id !== excludeId)
      .map((row) => row.slug)
  );

  if (!taken.has(base)) return base;

  // `startsWith` also matches siblings such as `vas-marlime-2`, so keep
  // stepping until an exact free slug is found.
  let suffix = 2;
  let candidate = `${base}-${suffix}`;

  while (taken.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}
