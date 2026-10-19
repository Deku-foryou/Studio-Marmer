'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

import { auth } from '@/auth';
import { isAdminRole } from '@/auth.config';
import { prisma } from '@/lib/db/prisma';
import {
  categoryExists,
  getAdminProductById,
  resolveUniqueSlug,
} from '@/lib/data/admin/products';
import {
  createProductSchema,
  specificationsToJson,
  updateProductSchema,
} from '@/lib/validation/product';
import { parseProductSubmission } from '@/lib/validation/product-form-data';
import { mergeSkippedSpecifications } from '@/lib/specifications';
import { cleanupUnreferencedAssets } from '@/lib/media-lifecycle';
import type { ProductFormState } from '@/lib/validation/product-action-state';
import { buildFlashHref } from '@/lib/admin/toast';

/**
 * Product mutations for the admin area.
 *
 * Every action repeats the same two checks before touching the database:
 *   1. a valid session exists (never trusting anything the client sent)
 *   2. the role is ADMIN or EDITOR
 *
 * Input is then validated with Zod on the server. HTML validation in the form
 * is only a usability aid.
 *
 * Returns a structured result so the client form can render Indonesian error
 * messages without a full page reload. Raw Prisma/database errors are never
 * returned to the client.
 */

/**
 * `ProductFormState` and `IDLE_STATE` are imported, not defined, here: a
 * `'use server'` module may only export async functions. See
 * lib/validation/product-action-state.ts for the full explanation.
 */

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Returns true only when the caller holds an ADMIN or EDITOR session. */
async function requireAdminEditor(): Promise<boolean> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !isAdminRole(user.role)) return false;

  return true;
}

/**
 * READING AND VALIDATING A SUBMISSION
 *
 * `toFieldErrors`, `readFormData` and `parseProductSubmission` used to live
 * here. They moved verbatim into `lib/validation/product-form-data.ts`, which is
 * where they are now imported from, for one reason: a `'use server'` module may
 * only export async functions, so none of them could ever be exported from this
 * file — and therefore none of them could be imported by a test either.
 *
 * The logic is unchanged. `parseProductSubmission` remains the single entry
 * point for both `createProduct` and `updateProduct`, so the row-limit rule
 * still cannot drift between the two.
 */

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  if (!(await requireAdminEditor())) {
    return {
      status: 'error',
      message: 'Anda tidak memiliki akses untuk menambah produk.',
    };
  }

  const parsed = parseProductSubmission(formData, createProductSchema);

  if (!parsed.ok) {
    return {
      status: 'error',
      message: 'Periksa kembali data yang diisi.',
      fieldErrors: parsed.fieldErrors,
    };
  }

  const input = parsed.data;
  const specifications = specificationsToJson(input.specifications);

  /*
   * EVERYTHING THAT TOUCHES THE DATABASE IS INSIDE THIS TRY
   *
   * The category lookup and the slug resolution are reads, and reads fail too —
   * a dropped connection or an unreachable host rejects the action just as a
   * failed write does. An action that throws does not return a state object at all:
   * React tears the form down into the nearest error boundary, which replaces the
   * page and destroys every field the admin had filled in. Returning a fixed
   * error state instead keeps the form mounted with its values intact, so the
   * admin can simply submit again once the database is reachable.
   */
  try {
    if (!(await categoryExists(input.categoryId))) {
      return {
        status: 'error',
        message: 'Periksa kembali data yang diisi.',
        fieldErrors: { categoryId: 'Kategori tidak ditemukan.' },
      };
    }

    const slug = await resolveUniqueSlug(input.name);

    const created = await prisma.product.create({
      data: {
        name: input.name,
        slug,
        categoryId: input.categoryId,
        shortDescription: input.shortDescription,
        description: input.description,
        pricingType: input.pricingType,
        price: new Prisma.Decimal(input.price),
        originalPrice:
          input.originalPrice === undefined
            ? null
            : new Prisma.Decimal(input.originalPrice),
        material: input.material ?? null,
        stoneType: input.stoneType,
        color: input.color,
        dimensions: input.dimensions,
        weightGrams: input.weightGrams,
        specifications: specifications ?? undefined,
        craftingTime: input.craftingTime ?? null,
        isAvailable: input.isAvailable,
        isUniquePiece: input.isUniquePiece,
        shopeeUrl: input.shopeeUrl ?? null,
        whatsappEnabled: input.whatsappEnabled,
        isFeatured: input.isFeatured,
        images: {
          create: input.images.map((image, index) => ({
            imageUrl: image.imageUrl,
            altText: image.altText ?? null,
            publicId: image.publicId ?? null,
            // Position in the submitted list becomes the display order, so the
            // first photo the admin chose is the gallery's cover.
            sortOrder: index,
          })),
        },
      },
      select: { id: true },
    });

    revalidatePath('/admin/produk');
    revalidatePath('/');

    /*
     * Straight to the edit screen so the admin can review what was saved.
     *
     * `redirect()` throws, so this action never returns a state object and
     * `useActionState` has nothing to render. The outcome therefore travels in
     * the URL as a `?toast=` key, which ToastFlashListener picks up on the
     * destination page. `created=1` used to sit here for an inline banner; the
     * toast replaces it, so the flag is gone.
     */
    redirect(buildFlashHref(`/admin/produk/${created.id}/edit`, 'produk-ditambahkan'));
  } catch (error) {
    // Never surface a raw Prisma error to the browser.
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        status: 'error',
        message: 'Produk gagal disimpan. Silakan coba lagi.',
      };
    }
    if (error instanceof Error && 'digest' in error) {
      // Next.js redirect() throws internally - let it propagate.
      throw error;
    }
    return {
      status: 'error',
      message: 'Terjadi kesalahan tak terduga. Silakan coba lagi.',
    };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateProduct(
  productId: number,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  if (!(await requireAdminEditor())) {
    return {
      status: 'error',
      message: 'Anda tidak memiliki akses untuk mengubah produk.',
    };
  }

  /*
   * The existence check is a read, and it sits inside the same try as the write for
   * the reason given in createProduct: an action that throws is torn down into an
   * error boundary, taking every field the admin filled in with it. A fixed error
   * state keeps the form and its values on screen.
   *
   * `existing` is declared outside so the specification rows it carries can be
   * reused when the column is rewritten below.
   */
  let existing: Awaited<ReturnType<typeof getAdminProductById>>;
  try {
    existing = await getAdminProductById(productId);
    if (!existing) {
      return {
        status: 'error',
        message: 'Produk tidak ditemukan.',
      };
    }
  } catch {
    return {
      status: 'error',
      message: 'Produk gagal disimpan. Silakan coba lagi.',
    };
  }

  const parsed = parseProductSubmission(formData, updateProductSchema);

  if (!parsed.ok) {
    return {
      status: 'error',
      message: 'Periksa kembali data yang diisi.',
      fieldErrors: parsed.fieldErrors,
    };
  }

  const input = parsed.data;
  /*
   * Rows the form could not show are carried through rather than dropped.
   * This rewrite replaces the whole column, so without this a save that had
   * nothing to do with specifications would still delete any stored row the
   * form could not represent.
   */
  const specifications = mergeSkippedSpecifications(
    specificationsToJson(input.specifications),
    existing.unrepresentableSpecifications
  );

  try {
    if (!(await categoryExists(input.categoryId))) {
      return {
        status: 'error',
        message: 'Periksa kembali data yang diisi.',
        fieldErrors: { categoryId: 'Kategori tidak ditemukan.' },
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          name: input.name,
          // The slug is intentionally left untouched: it is the public URL and
          // regenerating it would break existing links and search indexing.
          categoryId: input.categoryId,
          shortDescription: input.shortDescription,
          description: input.description,
          pricingType: input.pricingType,
          price: new Prisma.Decimal(input.price),
          originalPrice:
            input.originalPrice === undefined
              ? null
              : new Prisma.Decimal(input.originalPrice),
          material: input.material ?? null,
          stoneType: input.stoneType,
          color: input.color,
          dimensions: input.dimensions,
          weightGrams: input.weightGrams,
          specifications: specifications ?? Prisma.DbNull,
          craftingTime: input.craftingTime ?? null,
          isAvailable: input.isAvailable,
          isUniquePiece: input.isUniquePiece,
          shopeeUrl: input.shopeeUrl ?? null,
          whatsappEnabled: input.whatsappEnabled,
          isFeatured: input.isFeatured,
        },
      });

      // ─── Gallery sync ───────────────────────────────────────────────────────────
      //
      // The submitted list is the source of truth for the gallery: reorder,
      // removal and addition all take effect by making the stored rows match it.
      //
      // Each surviving image is matched on `publicId` when it has one, so an
      // existing row is updated in place and keeps its identity. A Cloudinary
      // asset that is dropped from the list loses only its database row here -
      // the remote asset is deliberately left alone for Phase 6C-2 to clean up.
      //
      // Rows with no public id (hosted elsewhere) cannot be matched reliably, so
      // they are keyed on their URL instead.
      const keep = input.images;

      const existing = await tx.productImage.findMany({
        where: { productId },
        select: { id: true, imageUrl: true, publicId: true },
      });

      // publicId first, URL as the fallback key: two photos of the same product
      // can legitimately share a URL only if the admin duplicated a row, in
      // which case the first match wins and the rest are simply not reused.
      const matchByPublicId = new Map<string, number>();
      const matchByUrl = new Map<string, number>();
      for (const row of existing) {
        if (row.publicId && !matchByPublicId.has(row.publicId)) {
          matchByPublicId.set(row.publicId, row.id);
        }
        if (!matchByUrl.has(row.imageUrl)) {
          matchByUrl.set(row.imageUrl, row.id);
        }
      }

      const reusedIds = new Set<number>();
      const operations: Prisma.PrismaPromise<unknown>[] = [];

      for (const [index, image] of keep.entries()) {
        const matchedId = image.publicId
          ? matchByPublicId.get(image.publicId)
          : undefined;
        const fallbackId = matchByUrl.get(image.imageUrl);
        const rowId =
          matchedId !== undefined && !reusedIds.has(matchedId)
            ? matchedId
            : fallbackId !== undefined && !reusedIds.has(fallbackId)
              ? fallbackId
              : undefined;

        const data = {
          imageUrl: image.imageUrl,
          altText: image.altText ?? null,
          // Filled in only when Cloudinary gave us one; an existing row keeps
          // whatever it already had rather than being blanked.
          ...(image.publicId ? { publicId: image.publicId } : {}),
          sortOrder: index,
        };

        if (rowId !== undefined) {
          reusedIds.add(rowId);
          operations.push(
            tx.productImage.update({ where: { id: rowId }, data })
          );
        } else {
          operations.push(
            tx.productImage.create({ data: { ...data, productId } })
          );
        }
      }

      // Only rows the admin actually removed are deleted. Comparing against the
      // set of reused ids is what stops a submit that merely re-saves the form
      // from wiping the gallery.
      const removedIds = existing
        .map((row) => row.id)
        .filter((id) => !reusedIds.has(id));

      if (removedIds.length > 0) {
        operations.push(
          tx.productImage.deleteMany({ where: { id: { in: removedIds } } })
        );
      }

      await Promise.all(operations);

      /*
       * CLOUDINARY CLEANUP — AFTER THE TRANSACTION COMMITTED
       *
       * The database is now the source of truth: any `public_id` that was on a
       * row before but is no longer on any row afterwards is unreferenced and
       * safe to delete remotely. Doing this inside the transaction would risk
       * deleting an asset the transaction then fails to commit, leaving the
       * storefront pointing at a file that no longer exists.
       *
       * A row that was UPDATED IN PLACE with a new photo also orphans its old
       * public id, so this set is computed from the before/after difference
       * rather than from `removedIds` alone — a replacement is not a removal,
       * but it leaves the same kind of orphan.
       */
      const orphanedPublicIds = existing
        .filter((row) => row.publicId)
        .map((row) => row.publicId as string)
        .filter((publicId) => {
          const stillUsed = keep.some((image) => image.publicId === publicId);
          return !stillUsed;
        });

      if (orphanedPublicIds.length > 0) {
        const cleanup = await cleanupUnreferencedAssets(orphanedPublicIds);
        if (cleanup.failed.length > 0 || cleanup.skippedNoCredentials) {
          console.warn(
            `[media-lifecycle] product ${productId} updated, but ${cleanup.failed.length} asset(s) need manual cleanup:`,
            cleanup.failed
          );
        }
      }
    });

    revalidatePath('/admin/produk');
    revalidatePath(`/admin/produk/${productId}/edit`);
    revalidatePath('/');

    return {
      status: 'success',
      message: 'Perubahan produk berhasil disimpan.',
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        status: 'error',
        message: 'Perubahan gagal disimpan. Silakan coba lagi.',
      };
    }
    return {
      status: 'error',
      message: 'Terjadi kesalahan tak terduga. Silakan coba lagi.',
    };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Deletes a product and returns the admin to the list.
 *
 * STILL `Promise<void>`
 * The return type is unchanged on purpose: `DeleteProductButton` calls this
 * inside `startTransition` and discards the value, so there is no caller to
 * widen a contract for. The outcome reaches the admin through the redirect's
 * `?toast=` key instead, which works identically for this action whether it
 * succeeds or fails.
 *
 * WHY THE TRY/CATCH
 * Without one, a database failure here rejects the promise inside
 * `startTransition`, and an unhandled rejection in a transition bubbles to the
 * nearest error boundary — a full-page crash replacing the dashboard, for what
 * is an ordinary recoverable failure. Catching it and redirecting back with an
 * error toast keeps the admin on the list and tells them what happened.
 *
 * The `'digest' in error` guard is not optional: `redirect()` signals by
 * throwing, so without it the success path would fall straight into the catch
 * and every successful delete would report a failure.
 *
 * CLOUDINARY ASSETS
 * The image rows are removed by ON DELETE CASCADE, so their `public_id` values
 * must be read BEFORE the product is deleted — afterwards they are simply gone
 * and the remote assets would be orphaned with no way to name them. The actual
 * Cloudinary deletion happens after the database commit succeeds; see
 * lib/media-lifecycle.ts for why that order matters.
 */
export async function deleteProduct(productId: number): Promise<void> {
  if (!(await requireAdminEditor())) {
    redirect('/admin/produk');
    return;
  }

  try {
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (existing) {
      // Read the public ids before deleting: CASCADE removes the rows in the
      // same statement, so this is the only moment they are still queryable.
      const imagesBefore = await prisma.productImage.findMany({
        where: { productId },
        select: { publicId: true },
      });
      const publicIds = imagesBefore
        .map((image) => image.publicId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

      // ProductImage rows are removed by the schema's ON DELETE CASCADE.
      await prisma.product.delete({ where: { id: productId } });

      // Now that the database no longer references these assets, ask the
      // lifecycle helper to delete them from Cloudinary. It re-checks
      // references before any network call, so an asset still used elsewhere
      // is kept.
      if (publicIds.length > 0) {
        const cleanup = await cleanupUnreferencedAssets(publicIds);
        if (cleanup.failed.length > 0 || cleanup.skippedNoCredentials) {
          // Server-side warning only. The database change succeeded, so the
          // admin must not see a failure — but the assets that could not be
          // deleted stay named here for a follow-up pass.
          console.warn(
            `[media-lifecycle] product ${productId} deleted, but ${cleanup.failed.length} asset(s) need manual cleanup:`,
            cleanup.failed
          );
        }
      }
    }

    revalidatePath('/admin/produk');
    revalidatePath('/');

    redirect(buildFlashHref('/admin/produk', 'produk-dihapus'));
  } catch (error) {
    if (error instanceof Error && 'digest' in error) {
      // Next.js redirect() throws internally - let it propagate.
      throw error;
    }

    // Nothing is surfaced from the raw error: no Prisma code, message, SQL or
    // stack ever reaches the browser. The admin gets a fixed sentence.
    revalidatePath('/admin/produk');

    redirect(buildFlashHref('/admin/produk', 'produk-gagal-dihapus'));
  }
}
