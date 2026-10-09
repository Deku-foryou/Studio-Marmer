/**
 * Admin data access layer for the gallery — Server Component / server-action only.
 *
 * Mirrors lib/data/admin/categories.ts: all Prisma access stays on the server, so
 * no Client Component ever imports the database driver, and everything returned is
 * a plain JSON-safe value.
 *
 * The list is intentionally unpaginated. A gallery is a curated, hand-ordered set
 * that an admin scans as a single board - splitting it across pages would hide the
 * ordering the whole module exists to manage. Categories are paginated because
 * their count grows with the catalogue; this table does not.
 */

if (typeof window !== 'undefined') {
  throw new Error(
    'lib/data/admin/gallery.ts is server-only and must not be imported by a Client Component.'
  );
}

import { prisma } from '@/lib/db/prisma';

/** Row shape for the admin gallery list. */
export interface AdminGalleryRow {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string;
  /** Cloudinary asset id, when the photo is hosted there. */
  publicId: string | null;
  altText: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Detail shape returned by getAdminGalleryItemById.
 *
 * Currently identical to the list row: the edit form reads the same columns. Named
 * separately so the two contracts can diverge later — the list is a summary, the
 * detail is what the edit screen renders — without touching call sites.
 */
export type AdminGalleryDetail = AdminGalleryRow;

/**
 * Every gallery item, in display order, optionally filtered.
 *
 * `isActive: null` means "no status filter" — distinct from `false`, which means
 * "inactive only". Ordered by the same `sortOrder, id` pair the storefront uses,
 * so what the admin arranges is exactly what the visitor sees.
 */
export async function listAdminGalleryItems(
  opts: { isActive?: boolean | null } = {}
): Promise<AdminGalleryRow[]> {
  const { isActive = null } = opts;

  const rows = await prisma.galleryImage.findMany({
    where: isActive === null ? {} : { isActive },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      publicId: true,
      altText: true,
      sortOrder: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });

  return rows;
}

/** Get a single gallery item by id, or `null` if not found. */
export async function getAdminGalleryItemById(
  id: number
): Promise<AdminGalleryDetail | null> {
  return prisma.galleryImage.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      publicId: true,
      altText: true,
      sortOrder: true,
      isActive: true,
      createdAt: true,
    },
  });
}

/** Total number of gallery items, for the list header. */
export async function countAdminGalleryItems(): Promise<number> {
  return prisma.galleryImage.count();
}

/**
 * Outcome of a one-place reorder attempt.
 *
 * `moved: false` means the photo was already at that end of the sequence — not a
 * failure, so the caller reports success rather than raising an error the admin
 * cannot act on.
 */
export type MoveGalleryItemOutcome =
  | { status: 'moved'; id: number }
  | { status: 'edge'; id: number }
  | { status: 'not-found' };

/**
 * Moves one photo one place up or down in the gallery order.
 *
 * WHY A SWAP RATHER THAN ±1
 * `sortOrder` is a display position, not a weight the storefront computes with, and
 * it is not unique. Incrementing it would often move nothing at all: a photo at 3
 * moved to 4 still renders after another photo at 4, and the `id` tiebreaker does
 * not move either. Swapping the two photos' values always changes the rendered
 * sequence by exactly one place.
 *
 * The neighbour is looked up in the *complete* ordered sequence, not in a filtered
 * view. With a status filter applied "the row above" is ambiguous, and swapping
 * against a photo the admin cannot see would be surprising.
 *
 * The whole read-swap-write runs in one transaction so two concurrent clicks cannot
 * both read the same order and write overlapping results.
 *
 * Lives here rather than in the server action so this ordering rule is one piece
 * of reusable, testable data logic instead of an inline transaction in a module
 * that can only export async functions.
 */
export async function moveGalleryItemBy(
  id: number,
  direction: -1 | 1
): Promise<MoveGalleryItemOutcome> {
  return prisma.$transaction(async (tx) => {
    const ordered = await tx.galleryImage.findMany({
      select: { id: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    const index = ordered.findIndex((row) => row.id === id);

    if (index === -1) return { status: 'not-found' };

    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= ordered.length) {
      return { status: 'edge', id };
    }

    const current = ordered[index];
    const neighbour = ordered[targetIndex];

    if (current.sortOrder === neighbour.sortOrder) {
      /*
       * Identical values cannot be swapped into a different order, because the
       * storefront breaks the tie on `id` — a swap would leave both rows identical.
       *
       * So the neighbour is pushed to the far side of the current value instead:
       * `current.sortOrder - direction`. Moving up (direction -1) raises the
       * neighbour by one, which puts the current photo in front of it; moving down
       * lowers it by one, which puts the current photo behind it. The sign is the
       * opposite of the movement on purpose — the moving photo keeps its value and
       * the one that yields is the one that changes.
       *
       * A single step suffices: the two rows were adjacent in the ordering, so no
       * third row can sit between `value` and `value ± 1`.
       */
      await tx.galleryImage.update({
        where: { id: neighbour.id },
        data: { sortOrder: current.sortOrder - direction },
      });
    } else {
      await Promise.all([
        tx.galleryImage.update({
          where: { id: current.id },
          data: { sortOrder: neighbour.sortOrder },
        }),
        tx.galleryImage.update({
          where: { id: neighbour.id },
          data: { sortOrder: current.sortOrder },
        }),
      ]);
    }

    return { status: 'moved', id };
  });
}