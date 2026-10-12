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
  type CreateProductInput,
  type UpdateProductInput,
} from '@/lib/validation/product';
import {
  findRowOverflow,
  MAX_PRODUCT_ROWS,
  overflowFieldErrors,
} from '@/lib/validation/product-rows';
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
 * Turns a Zod failure into the flat field-error map the form expects.
 */
function toFieldErrors(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): Record<string, string> {
  const { fieldErrors } = error.flatten();
  const out: Record<string, string> = {};

  for (const [key, messages] of Object.entries(fieldErrors)) {
    const first = messages?.[0];
    if (first) out[key] = first;
  }

  return out;
}

/**
 * Reads the structured spec/image row inputs produced by the form.
 * The form serialises each repeatable row as indexed keys:
 *   spec_0_label, spec_0_value, image_0_url, image_0_alt, ...
 *
 * ROWS BEYOND THE LIMIT
 * The loops below read indices `0 … MAX_PRODUCT_ROWS - 1` and stop. A crafted or
 * stale submission carrying a further row is therefore TRUNCATED here, before
 * Zod runs: the schema's `.max()` would receive exactly 26 items and pass, and
 * the extra row would disappear with no error at all — the admin would believe
 * their 27th photo was saved.
 *
 * `findRowOverflow` closes that gap by inspecting the submitted keys once, so
 * the caller can reject the submission instead of quietly dropping data. The
 * two are deliberately paired: neither is sufficient alone.
 */
function readFormData(formData: FormData) {
  const getString = (key: string): string => {
    const value = formData.get(key);
    return typeof value === 'string' ? value : '';
  };

  const lastIndex = MAX_PRODUCT_ROWS - 1;

  const specifications: { label: string; value: string }[] = [];
  for (let i = 0; ; i += 1) {
    const label = getString(`spec_${i}_label`);
    const value = getString(`spec_${i}_value`);
    if (!label && !value && i > lastIndex) break;
    specifications.push({ label, value });
    if (i > lastIndex) break;
  }

  /**
   * Images arrive as indexed hidden inputs written by the uploader component,
   * one triple per slot in display order:
   *   image_0_url, image_0_publicId, image_0_alt, image_1_url, ...
   *
   * The public id is optional: a slot that predates Cloudinary hosting, or an
   * image hosted elsewhere, simply omits it. A row with no URL at all is dropped
   * below, which is what makes "save with zero photos" work.
   */
  const images: {
    imageUrl: string;
    altText: string;
    publicId: string;
  }[] = [];
  for (let i = 0; ; i += 1) {
    const imageUrl = getString(`image_${i}_url`);
    const altText = getString(`image_${i}_alt`);
    const publicId = getString(`image_${i}_publicId`);
    if (!imageUrl && !altText && !publicId && i > lastIndex) break;
    images.push({ imageUrl, altText, publicId });
    if (i > lastIndex) break;
  }

  return {
    name: getString('name'),
    categoryId: getString('categoryId'),
    shortDescription: getString('shortDescription'),
    description: getString('description'),
    pricingType: getString('pricingType'),
    price: getString('price'),
    originalPrice: getString('originalPrice'),
    material: getString('material'),
    stoneType: getString('stoneType'),
    color: getString('color'),
    dimensions: getString('dimensions'),
    weightGrams: getString('weightGrams'),
    craftingTime: getString('craftingTime'),
    shopeeUrl: getString('shopeeUrl'),
    isAvailable: formData.get('isAvailable') === 'on',
    isUniquePiece: formData.get('isUniquePiece') === 'on',
    isFeatured: formData.get('isFeatured') === 'on',
    whatsappEnabled: formData.get('whatsappEnabled') === 'on',
    specifications: specifications.filter(
      (row) => row.label.trim() !== '' || row.value.trim() !== ''
    ),
    images: images.filter((row) => row.imageUrl.trim() !== ''),
  };
}

/**
 * Validates a product submission and returns either the parsed input or the
 * field errors to render.
 *
 * SHARED BY CREATE AND UPDATE ON PURPOSE
 * The row-limit rule must be identical for a new product and an edited one. A
 * check written into only one action would leave the other silently truncating,
 * which is the exact failure being fixed here.
 *
 * Overflow is merged into the Zod errors rather than replacing them, so a
 * submission that is both over the limit and missing a required field reports
 * both problems in one round trip instead of one per attempt.
 */
function parseProductSubmission(
  formData: FormData,
  schema: typeof createProductSchema | typeof updateProductSchema
):
  | { ok: true; data: CreateProductInput | UpdateProductInput }
  | { ok: false; fieldErrors: Record<string, string> } {
  const parsed = schema.safeParse(readFormData(formData));

  /*
   * Checked against the RAW FormData, not the parsed arrays: by the time Zod
   * runs, any row past the limit has already been dropped by readFormData and is
   * no longer visible. Scanning the submitted keys is the only place the extra
   * row still exists.
   */
  const overflow = findRowOverflow(formData.entries());

  const fieldErrors: Record<string, string> = parsed.success
    ? {}
    : toFieldErrors(parsed.error);
  Object.assign(fieldErrors, overflowFieldErrors(overflow));

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  // `fieldErrors` is empty, which only happens when `parsed` succeeded.
  return { ok: true, data: parsed.data as CreateProductInput | UpdateProductInput };
}

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
   */
  try {
    const existing = await getAdminProductById(productId);
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
  const specifications = specificationsToJson(input.specifications);

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
