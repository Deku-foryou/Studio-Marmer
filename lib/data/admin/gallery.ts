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
 * Result of the pure reordering step, before anything is written.
 *
 * `moved` carries the full new sequence, because the caller renumbers every
 * row from it. `edge` and `not-found` carry nothing: nothing was changed.
 */
export type ApplyGalleryMoveResult =
  | { status: 'moved'; orderedIds: number[] }
  | { status: 'edge' }
  | { status: 'not-found' };

/**
 * The position a newly created photo should take when the admin did not pick
 * one explicitly.
 *
 * Rows used to default to `0`, which meant every new photo landed in the same
 * bucket and the storefront's `id` tiebreaker decided the real order. Appending
 * after the current maximum puts a new photo at the end of the gallery, where
 * "added last" is the honest expectation.
 *
 * Exported so the rule is testable without a database.
 */
export async function nextGallerySortOrder(): Promise<number> {
  const last = await prisma.galleryImage.findFirst({
    orderBy: [{ sortOrder: 'desc' }, { id: 'desc' }],
    select: { sortOrder: true },
  });

  return (last?.sortOrder ?? -1) + 1;
}

/**
 * Computes the new order after moving one item one place up or down.
 *
 * `orderedIds` must already be in the sequence the storefront renders
 * (`sortOrder asc`, then `id asc` as the tiebreaker) — the caller reads it that
 * way. The function only swaps two entries and touches nothing else.
 *
 * WHY THE POSITION IS SWAPPED AND NOT DERIVED FROM `sortOrder`
 * `sortOrder` is a display position, and it is not unique. Photos created
 * without an explicit position all share the same value, and the storefront
 * breaks the tie on `id`. Adjusting a single value by ±1 therefore does not do
 * what it looks like: with three photos at `sortOrder = 0`, moving the middle
 * one up bumped its neighbour to `1` and the result was `2, 3, 1` — the photo
 * that was never touched jumped ahead of the one that was moved. Swapping two
 * entries of the already-ordered list cannot depend on the stored values at all.
 *
 * Pure and exported so this ordering rule is testable without a database.
 */
export function applyGalleryMove(
  orderedIds: readonly number[],
  id: number,
  direction: -1 | 1
): ApplyGalleryMoveResult {
  const index = orderedIds.indexOf(id);
  if (index === -1) return { status: 'not-found' };

  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= orderedIds.length) {
    return { status: 'edge' };
  }

  const next = [...orderedIds];
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);

  return { status: 'moved', orderedIds: next };
}

/**
 * Moves one photo one place up or down in the gallery order.
 *
 * The neighbour is looked up in the *complete* ordered sequence, not in a
 * filtered view. With a status filter applied "the row above" is ambiguous, and
 * swapping against a photo the admin cannot see would be surprising.
 *
 * The whole read-renumber-write runs in one transaction so two concurrent
 * clicks cannot both read the same order and write overlapping results.
 *
 * After the swap, every row's `sortOrder` is rewritten to its position in the
 * new sequence. Writing only the two rows that changed left duplicate values
 * behind, and those duplicates are exactly what the storefront's `id`
 * tiebreaker then resolves into an order nobody asked for. Renumbering is one
 * extra write per photo in a sequence small enough for the admin UI to be
 * usable, and it leaves no two rows sharing a value — so the next move starts
 * from a well-defined sequence.
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

    const result = applyGalleryMove(
      ordered.map((row) => row.id),
      id,
      direction
    );

    if (result.status === 'not-found') return { status: 'not-found' };
    if (result.status === 'edge') return { status: 'edge', id };

    // Renumber the whole sequence to its positions.
    await Promise.all(
      result.orderedIds.map((rowId, position) =>
        tx.galleryImage.update({
          where: { id: rowId },
          data: { sortOrder: position },
        })
      )
    );

    return { status: 'moved', id };
  });
}