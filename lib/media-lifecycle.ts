import { prisma } from '@/lib/db/prisma';
import {
  deleteCloudinaryAsset,
  isWithinAssetScope,
  type CloudinaryDeleteResult,
} from '@/lib/cloudinary-delete';

/**
 * Central media-asset lifecycle helper.
 *
 * THE PROBLEM THIS SOLVES
 * Uploads go straight from the browser to Cloudinary, so the application holds
 * only the resulting `public_id`. Until now every delete and replace path removed
 * the MySQL row and left the remote asset behind, because deleting remote media
 * needs a server-side credential the codebase did not have. That left real files
 * in the `studio-marmer/*` media library that no row referenced — and, worse,
 * a replace silently orphaned the previous photo.
 *
 * THE RULE THIS ENFORCES
 * A Cloudinary asset is deleted only when BOTH hold:
 *   1. its `public_id` is inside a folder this application owns, and
 *   2. no live database row references it.
 *
 * Either condition failing means the asset is kept. That is the safe direction:
 * an unreferenced file costs storage; a deleted file that a product still points
 * at is a broken image on the storefront.
 *
 * WHY THE DATABASE IS CHECKED AGAIN HERE
 * MySQL and Cloudinary share no transaction. Between the moment a row stops
 * referencing an asset and the moment Cloudinary confirms the delete, another
 * request could have started referencing it. Re-reading the database immediately
 * before the delete call is what makes "delete only unreferenced" true rather
 * than merely intended.
 *
 * ORDERING CONTRACT WITH CALLERS
 * Callers must commit the database change FIRST and only then call this helper.
 * Deleting the asset first would leave a window in which the row points at a file
 * that no longer exists.
 */

/** Every column in the schema that stores a Cloudinary public id. */
const PUBLIC_ID_COLUMNS = [
  { model: 'productImage', column: 'publicId' },
  { model: 'category', column: 'publicId' },
  { model: 'galleryImage', column: 'publicId' },
  { model: 'siteSettings', column: 'logoPublicId' },
  { model: 'siteSettings', column: 'heroImagePublicId' },
] as const;

export type CleanupResult = {
  /** Assets Cloudinary confirmed gone. */
  deleted: string[];
  /** Assets already absent upstream — the end state the caller wanted. */
  notFound: string[];
  /** Assets that could not be deleted and still need a later pass. */
  failed: string[];
  /** Assets deliberately kept because something still references them. */
  retained: string[];
  /** Candidates rejected before any network call (out of scope / malformed). */
  rejected: string[];
  /** True when no credentials are configured, so nothing was attempted. */
  skippedNoCredentials: boolean;
};

/**
 * True while any live row still stores `publicId`.
 *
 * `siteSettings` is a singleton, so its two columns are checked with a single
 * `findFirst` rather than a count.
 */
export async function isPublicIdReferenced(publicId: string): Promise<boolean> {
  const [productImages, categories, galleryImages, siteSettings] = await Promise.all([
    prisma.productImage.findFirst({
      where: { publicId },
      select: { id: true },
    }),
    prisma.category.findFirst({ where: { publicId }, select: { id: true } }),
    prisma.galleryImage.findFirst({ where: { publicId }, select: { id: true } }),
    prisma.siteSettings.findFirst({
      where: { OR: [{ logoPublicId: publicId }, { heroImagePublicId: publicId }] },
      select: { id: true },
    }),
  ]);

  return Boolean(productImages || categories || galleryImages || siteSettings);
}

/**
 * Deletes every candidate that is in scope and no longer referenced.
 *
 * `candidates` are `public_id` values that a caller has already decided are no
 * longer wanted — typically the value a row held *before* an update committed.
 * This function never derives candidates from the browser and never guesses a
 * public id from a URL.
 *
 * Failures are collected, not thrown: one unreachable asset must not abort the
 * caller's already-committed database change, and must not be reported as a
 * success the admin cannot act on.
 */
export async function cleanupUnreferencedAssets(
  candidates: readonly string[]
): Promise<CleanupResult> {
  const result: CleanupResult = {
    deleted: [],
    notFound: [],
    failed: [],
    retained: [],
    rejected: [],
    skippedNoCredentials: false,
  };

  // De-duplicate so a value submitted twice is not deleted twice.
  const unique = [...new Set(candidates)];

  for (const candidate of unique) {
    if (!isWithinAssetScope(candidate)) {
      result.rejected.push(candidate);
      continue;
    }

    // Re-read the database immediately before the delete. See the ordering
    // contract above.
    if (await isPublicIdReferenced(candidate)) {
      result.retained.push(candidate);
      continue;
    }

    const outcome: CloudinaryDeleteResult = await deleteCloudinaryAsset(candidate);

    switch (outcome.outcome) {
      case 'deleted':
        result.deleted.push(candidate);
        break;
      case 'not-found':
        result.notFound.push(candidate);
        break;
      case 'skipped-no-credentials':
        // Recorded once; the caller reports it rather than claiming success.
        result.skippedNoCredentials = true;
        result.failed.push(candidate);
        break;
      case 'error':
        result.failed.push(candidate);
        break;
    }
  }

  return result;
}

/**
 * Convenience wrapper for the common "replace one image" case.
 *
 * Returns the old public id when it should be cleaned up, or `null` when there is
 * nothing to clean — which is what a metadata-only edit must produce.
 */
export async function cleanupReplacedAsset(
  previousPublicId: string | null | undefined,
  nextPublicId: string | null | undefined
): Promise<CleanupResult | null> {
  // No previous asset, or the value did not actually change: nothing to clean.
  // This is what keeps a metadata-only save from deleting a live photo.
  if (!previousPublicId) return null;
  if (previousPublicId === nextPublicId) return null;

  return cleanupUnreferencedAssets([previousPublicId]);
}
