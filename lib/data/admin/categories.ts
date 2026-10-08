/**
 * Admin data access layer for categories — Server Component / server-action only.
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
    'lib/data/admin/categories.ts is server-only and must not be imported by a Client Component.'
  );
}

import { prisma } from '@/lib/db/prisma';

/** Rows returned per page by `listAdminCategories`. */
const PAGE_SIZE = 20;

/** Row shape for the admin category list table. */
export interface AdminCategoryRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  /** Cloudinary asset id, when the image is hosted there. */
  publicId: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  updatedAt: Date | null;
}

/** Lightweight detail shape returned by getAdminCategoryById. */
export interface AdminCategoryDetail {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  /** Cloudinary asset id, so the edit form can re-submit it unchanged. */
  publicId: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

/** Get all admin categories with optional search, filter, ordering, and paging. */
export interface ListAdminCategoriesOptions {
  search?: string;
  isActive?: boolean | null;
  sortBy?: 'sortOrder' | 'name';
  sortDir?: 'asc' | 'desc';
  /** 1-based page number. Rows per page are the DAL's own PAGE_SIZE. */
  page?: number;
}

/** Returns `{ categories: AdminCategoryRow[], total: number }`.
 */
export async function listAdminCategories(
  opts: ListAdminCategoriesOptions = {}
) {
  const { search, isActive, sortBy = 'sortOrder', sortDir = 'asc' } = opts;
  const page = Math.max(1, opts.page ?? 1);

  const where: Record<string, unknown> = {};

  if (search) {
    // No `mode: 'insensitive'`: Prisma only supports it on PostgreSQL and
    // MongoDB, and passing it on MySQL throws a validation error. The default
    // utf8mb4 collation is already case-insensitive, so `contains` matches
    // "vas" against "Vases" without it.
    where.OR = [
      { name: { contains: search } },
      { slug: { contains: search } },
      { description: { contains: search } },
    ];
  }

  if (isActive !== null) {
    where.isActive = isActive;
  }

  const orderBy = {} as Record<string, unknown>;
  orderBy[sortBy] = sortDir;

  const [items, total] = await prisma.$transaction([
    prisma.category.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      // Counted by the database in the same round trip. A hardcoded 0 here
      // would silently lie to the admin about which categories still hold
      // products and therefore cannot be deleted.
      include: { _count: { select: { products: true } } },
    }),
    prisma.category.count({ where }),
  ])

  return {
    categories: items.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl,
      publicId: c.publicId,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      productCount: c._count.products,
      updatedAt: c.updatedAt,
    })),
    total,
  }
}

/** Get a single category by id, or `null` if not found. */
export async function getAdminCategoryById(
  id: number
): Promise<AdminCategoryDetail | null> {
  const c = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!c) return null;

  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    publicId: c.publicId,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    productCount: c._count.products,
  };
}

/** Return the number of products in this category. */
export async function getCategoryProductCount(id: number): Promise<number> {
  return prisma.product.count({
    where: { categoryId: id },
  });
}

/** Generate a deterministic, URL-safe slug from a category name.
 *  Resolves collisions with numeric suffixes (-2, -3, ...) against the
 *  existing database.  The caller may pass an optional `excludeId` so that
 *  editing a category does not clash with its own current slug. */
export async function resolveUniqueCategorySlug(
  name: string,
  excludeId?: number
): Promise<string> {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const candidate = base || 'kategori';
  const taken = new Set<string>();

  // Load all existing slugs once.
  const all = await prisma.category.findMany({
    select: { id: true, slug: true },
  });
  all.forEach((c) => {
    if (c.id !== excludeId) taken.add(c.slug);
  });

  // If the base slug is free, use it.
  if (!taken.has(candidate)) return candidate;

  // Otherwise, try -2, -3, ... until we find one that's free.
  for (let i = 2; ; i++) {
    const trial = `${base}-${i}`;
    if (!taken.has(trial)) return trial;
  }
}