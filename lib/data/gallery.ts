/**
 * Server-only data access layer for the public gallery.
 *
 * Same architecture as lib/data/products.ts:
 *   UI (Server Component) -> these functions -> Prisma -> MySQL
 *
 * Client Components must never import this module. See the note in
 * lib/data/products.ts for why that boundary is enforced without the `server-only`
 * package.
 */

if (typeof window !== 'undefined') {
  throw new Error(
    'lib/data/gallery.ts is server-only and must not be imported by a Client Component.'
  );
}

import { prisma } from '@/lib/db/prisma';

/** One published gallery photograph, ready to render. */
export interface GalleryPhoto {
  id: string;
  title: string;
  /** Optional admin note; not shown in the grid. */
  description: string | null;
  imageUrl: string;
  /**
   * Accessible description for the photograph.
   *
   * Falls back to the title when an admin saved the item without alt text: an
   * empty `alt` would tell a screen reader the image is decorative, which is a
   * claim about the photograph nobody has made.
   */
  altText: string;
}

/**
 * Published gallery photographs, in display order.
 *
 * Only `isActive` rows are returned: `isActive` is the single switch that decides
 * whether a photo appears on the storefront, so an inactive item must never leak
 * out through this query.
 *
 * `sortOrder` is the admin-defined order. `id` breaks ties, which matters because
 * sortOrder is not unique - two items left at the default 0 would otherwise swap
 * places between renders, and the visitor could see a different photo first on a
 * reload. The pair matches the `gallery_images_isActive_sortOrder_idx` index.
 */
export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  const rows = await prisma.galleryImage.findMany({
    where: { isActive: true },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      altText: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });

  return rows.map((row) => ({
    id: String(row.id),
    title: row.title,
    description: row.description,
    imageUrl: row.imageUrl,
    altText: row.altText?.trim() || row.title,
  }));
}