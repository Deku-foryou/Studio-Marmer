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

/** Row shape for the admin category list table. */
export interface AdminCategoryRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
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
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

/** Get all admin categories with optional search, filter, and ordering. */
export interface ListAdminCategoriesOptions {
  search?: string;
  isActive?: boolean | null;
  sortBy?: 'sortOrder' | 'name';
  sortDir?: 'asc' | 'desc';
}

/** Returns `{ categories: AdminCategoryRow[], total: number }`.
 */
export async function listAdminCategories(
  opts: ListAdminCategoriesOptions = {}
) {
  const { search, isActive, sortBy = 'sortOrder', sortDir = 'asc' } = opts;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
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
    }),
    prisma.category.count({ where }),
  ]);

  return {
    categories: items.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      productCount: 0,
      updatedAt: c.updatedAt,
    })),
    total,
  };
}

/** Get a single category by id, or `null` if not found. */
export function getAdminCategoryById(id: number): Promise<AdminCategoryDetail | null> {
  return prisma.category.findUnique({
    where: { id },
  }).then((c) => {
    if (!c) return null;
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      productCount: 0,
    };
  });
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