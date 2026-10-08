/**
 * Server-only data access layer for the product catalog.
 *
 * Architecture:
 *   UI (Server Component)  ->  these functions  ->  Prisma  ->  MySQL
 *
 * Nothing in this file may be imported by a Client Component. Two independent
 * guards enforce that:
 *  1. This module imports `@/lib/db/prisma`, which imports `@prisma/client`.
 *     The Prisma driver cannot be bundled for the browser, so a stray import
 *     from a `'use client'` file fails the Next.js build outright.
 *  2. The runtime guard below throws if the module is ever evaluated in a
 *     browser-like environment.
 *
 * (The official `server-only` package would express intent more directly, but
 * it is deliberately not added to keep this phase's dependency set unchanged.)
 *
 * SERIALIZATION CONTRACT:
 * Prisma returns `Decimal` for money columns. A Decimal instance is not a
 * plain JSON value, so it is converted to `number` here - at the server
 * boundary - and never leaves this module. Everything returned from here is
 * JSON-safe and may be passed directly to Client Components.
 */

if (typeof window !== 'undefined') {
  throw new Error(
    'lib/data/products.ts is server-only and must not be imported by a Client Component.'
  );
}

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import type {
  CatalogCategory,
  CatalogPage,
  CatalogProduct,
  PricingType,
  ProductDetail,
  ProductSpecification,
  SortOption,
  StockStatus,
} from '@/types/product';

/** Days within which a product is flagged as a "new arrival" in the UI. */
const NEW_ARRIVAL_WINDOW_DAYS = 45;

type ProductRow = {
  id: number;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  price: unknown;
  originalPrice: unknown;
  pricingType: string;
  material: string | null;
  stoneType: string | null;
  dimensions: string;
  weightGrams: number;
  color: string;
  specifications: unknown;
  craftingTime: string | null;
  isAvailable: boolean;
  isUniquePiece: boolean;
  shopeeUrl: string | null;
  whatsappEnabled: boolean;
  isFeatured: boolean;
  createdAt: Date;
  category: { name: string; slug: string };
  images: { imageUrl: string; altText: string | null; sortOrder: number }[];
};

// ─── Serialization helpers ────────────────────────────────────────────────────

/** Decimal | number | string -> number. Never returns a Prisma Decimal. */
function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const maybe = value as { toNumber: () => number };
    if (typeof maybe.toNumber === 'function') return maybe.toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = toNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Discount percentage is never stored - always derived. */
function deriveDiscountPercentage(
  price: number,
  originalPrice: number | null
): number {
  if (originalPrice === null || originalPrice <= 0 || originalPrice <= price) {
    return 0;
  }
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

/**
 * Maps the persisted availability flags onto the three-state label the
 * existing UI already renders. A one-of-a-kind piece is "Limited" because
 * only one exists - not because of a stock count.
 */
function deriveStockStatus(
  isAvailable: boolean,
  isUniquePiece: boolean
): StockStatus {
  if (!isAvailable) return 'Out of Stock';
  if (isUniquePiece) return 'Limited Stock';
  return 'In Stock';
}

function isNewArrival(createdAt: Date): boolean {
  const windowMs = NEW_ARRIVAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - createdAt.getTime() <= windowMs;
}

/** Images arrive already ordered by sortOrder (see ORDER BY below). */
function primaryImage(row: ProductRow): {
  imageUrl: string;
  imageAlt: string;
} {
  const first = row.images[0];
  return {
    imageUrl: first?.imageUrl ?? '/placeholders/marble-carrara.png',
    imageAlt:
      first?.altText?.trim() ||
      `${row.name} - marble craft product (placeholder image)`,
  };
}

/**
 * Normalizes the `specifications` JSON column into display-ready pairs.
 * The column is loosely typed in the database, so unknown shapes are ignored
 * rather than trusted.
 */
function normalizeSpecifications(value: unknown): ProductSpecification[] {
  if (!Array.isArray(value)) return [];

  const out: ProductSpecification[] = [];
  for (const entry of value) {
    if (entry && typeof entry === 'object') {
      const record = entry as Record<string, unknown>;
      const label = typeof record.label === 'string' ? record.label : null;
      const rawValue = record.value;
      const displayValue =
        typeof rawValue === 'string' || typeof rawValue === 'number'
          ? String(rawValue)
          : null;
      if (label && displayValue) {
        out.push({ label, value: displayValue });
      }
    }
  }
  return out;
}

// ─── Shared query shape ───────────────────────────────────────────────────────

const PRODUCT_SELECT = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  description: true,
  price: true,
  originalPrice: true,
  pricingType: true,
  material: true,
  stoneType: true,
  dimensions: true,
  weightGrams: true,
  color: true,
  specifications: true,
  craftingTime: true,
  isAvailable: true,
  isUniquePiece: true,
  shopeeUrl: true,
  whatsappEnabled: true,
  isFeatured: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  images: {
    select: { imageUrl: true, altText: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
  },
} as const;

// ─── Row -> DTO mappers ───────────────────────────────────────────────────────

function toCatalogProduct(row: ProductRow): CatalogProduct {
  const price = toNumber(row.price);
  const originalPrice = optionalToNumber(row.originalPrice);
  const image = primaryImage(row);

  return {
    id: String(row.id),
    slug: row.slug,
    title: row.name,
    brand: row.stoneType ?? row.material ?? 'Marble',
    category: row.category.name,
    categorySlug: row.category.slug,
    price,
    originalPrice,
    discountPercentage: deriveDiscountPercentage(price, originalPrice),
    pricingType: row.pricingType as PricingType,
    stockStatus: deriveStockStatus(row.isAvailable, row.isUniquePiece),
    isTrending: row.isFeatured,
    isNewArrival: isNewArrival(row.createdAt),
    isUniquePiece: row.isUniquePiece,
    isAvailable: row.isAvailable,
    imageUrl: image.imageUrl,
    imageAlt: image.imageAlt,
  };
}

function toProductDetail(row: ProductRow): ProductDetail {
  return {
    ...toCatalogProduct(row),
    material: row.material,
    stoneType: row.stoneType,
    color: row.color,
    dimensions: row.dimensions,
    weightGrams: row.weightGrams,
    craftingTime: row.craftingTime,
    shopeeUrl: row.shopeeUrl,
    whatsappEnabled: row.whatsappEnabled,
    isFeatured: row.isFeatured,
    shortDescription: row.shortDescription,
    description: row.description,
    specifications: normalizeSpecifications(row.specifications),
    imageUrls: row.images.length
      ? row.images.map((image) => image.imageUrl)
      : ['/placeholders/marble-carrara.png'],
  };
}

// ─── Paginated catalog query ───────────────────────────────────────────────────

/** Everything the catalog page needs to know about what the visitor asked for. */
export interface CatalogQueryInput {
  /** 1-based; clamped against the real result count before querying. */
  readonly page: number;
  readonly pageSize: number;
  readonly search: string;
  readonly categories: readonly string[];
  readonly inStockOnly: boolean;
  readonly sort: SortOption;
}

/**
 * Translates a URL request into a Prisma `where`.
 *
 * Mirrors the filtering that used to run in the browser (see
 * `hooks/useFilteredProducts.ts`, since removed): category slugs OR together,
 * free text matches name / stone / material / category, and "in stock only"
 * keeps only purchasable pieces.
 */
function buildCatalogWhere(input: CatalogQueryInput): Prisma.ProductWhereInput {
  const conditions: Prisma.ProductWhereInput[] = [
    // The storefront never lists a sold-out piece - unchanged from getProducts().
    { isAvailable: true },
  ];

  if (input.categories.length > 0) {
    conditions.push({
      category: { slug: { in: [...input.categories] } },
    });
  }

  // `stockStatus` is derived from `isAvailable` in toCatalogProduct(), so
  // "tersedia saja" is the same predicate the old client-side filter applied.
  if (input.inStockOnly) {
    conditions.push({ isAvailable: true });
  }

  const search = input.search.trim();
  if (search) {
    // MySQL's default collation is case-insensitive, so `contains` reproduces
    // the old `toLowerCase().includes()` behaviour without a function index.
    conditions.push({
      OR: [
        { name: { contains: search } },
        { stoneType: { contains: search } },
        { material: { contains: search } },
        { category: { name: { contains: search } } },
      ],
    });
  }

  return { AND: conditions };
}

/**
 * Sort order for the catalog grid.
 *
 * `featured` keeps the storefront's editorial order (flagged first, then
 * newest); `trending` sorted by the same flag client-side. Every branch ends
 * with `id` so paging is stable - without a total tiebreaker, two products at
 * the same price can swap between pages and the visitor sees one twice.
 */
function buildCatalogOrderBy(
  sort: SortOption
): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'price-asc':
      return [{ price: 'asc' }, { id: 'asc' }];
    case 'price-desc':
      return [{ price: 'desc' }, { id: 'asc' }];
    case 'trending':
    case 'featured':
    default:
      return [{ isFeatured: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }];
  }
}

/**
 * One page of the catalog, filtered and sorted in the database.
 *
 * This is the replacement for fetching the whole catalog and slicing it in the
 * browser: `count` establishes how many products matched, the requested page is
 * clamped into range, and only that slice is fetched with `skip`/`take`.
 *
 * The count runs first because the clamp needs it - a request for `?page=99` on
 * a 2-page result set returns the last page rather than an empty grid.
 */
export async function getCatalogProducts(
  input: CatalogQueryInput
): Promise<CatalogPage> {
  const pageSize = Math.max(1, Math.floor(input.pageSize));
  const requestedPage = Math.floor(input.page);
  const where = buildCatalogWhere(input);
  const orderBy = buildCatalogOrderBy(input.sort);

  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(
    Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1),
    totalPages
  );

  const rows = (await prisma.product.findMany({
    where,
    orderBy,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    select: PRODUCT_SELECT,
  })) as ProductRow[];

  return {
    products: rows.map(toCatalogProduct),
    total,
    totalPages,
    currentPage,
    pageSize,
  };
}

/**
 * Available products per category slug, for the homepage category strip.
 *
 * An aggregate rather than a full catalog read, so the strip keeps showing
 * whole-catalogue counts while the grid itself only ever loads 8 rows.
 */
export async function getProductCountsByCategory(): Promise<Record<string, number>> {
  const grouped = await prisma.product.groupBy({
    by: ['categoryId'],
    where: { isAvailable: true },
    _count: { _all: true },
  });

  if (grouped.length === 0) return {};

  const categories = await prisma.category.findMany({
    select: { id: true, slug: true },
  });
  const slugById = new Map(
    categories.map((category) => [String(category.id), category.slug])
  );

  const counts: Record<string, number> = {};
  for (const row of grouped) {
    const slug = slugById.get(String(row.categoryId));
    if (slug) counts[slug] = row._count._all;
  }
  return counts;
}

// ─── Public queries ───────────────────────────────────────────────────────────

/**
 * All products for the catalog listing.
 * Only available products are returned; unavailable ones are excluded so the
 * storefront never shows a sold-out piece in the grid.
 */
export async function getProducts(): Promise<CatalogProduct[]> {
  const rows = (await prisma.product.findMany({
    where: { isAvailable: true },
    select: PRODUCT_SELECT,
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
  })) as ProductRow[];

  return rows.map(toCatalogProduct);
}

/** Full detail for one product, looked up by its public slug. */
export async function getProductBySlug(
  slug: string
): Promise<ProductDetail | null> {
  const row = (await prisma.product.findUnique({
    where: { slug },
    select: PRODUCT_SELECT,
  })) as ProductRow | null;

  return row ? toProductDetail(row) : null;
}

/** Products flagged as featured, newest first. */
export async function getFeaturedProducts(): Promise<CatalogProduct[]> {
  const rows = (await prisma.product.findMany({
    where: { isAvailable: true, isFeatured: true },
    select: PRODUCT_SELECT,
    orderBy: { createdAt: 'desc' },
  })) as ProductRow[];

  return rows.map(toCatalogProduct);
}

/** Active categories, in the admin-defined display order. */
export async function getCategories(): Promise<CatalogCategory[]> {
  const rows = await prisma.category.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      sortOrder: true,
      isActive: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return rows.map((row) => ({
    id: String(row.id),
    name: row.name,
    slug: row.slug,
    imageUrl: row.imageUrl,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  }));
}

/** Slugs for `generateStaticParams` and 404 pre-checks. */
export async function getAllProductSlugs(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { isAvailable: true },
    select: { slug: true },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((row) => row.slug);
}
