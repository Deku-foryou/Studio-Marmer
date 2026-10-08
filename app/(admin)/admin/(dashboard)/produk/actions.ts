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
import type { ProductFormState } from '@/lib/validation/product-action-state';

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
 */
function readFormData(formData: FormData) {
  const getString = (key: string): string => {
    const value = formData.get(key);
    return typeof value === 'string' ? value : '';
  };

  const specifications: { label: string; value: string }[] = [];
  for (let i = 0; ; i += 1) {
    const label = getString(`spec_${i}_label`);
    const value = getString(`spec_${i}_value`);
    if (!label && !value && i > 24) break;
    specifications.push({ label, value });
    if (i > 24) break;
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
    if (!imageUrl && !altText && !publicId && i > 24) break;
    images.push({ imageUrl, altText, publicId });
    if (i > 24) break;
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

  const parsed = createProductSchema.safeParse(readFormData(formData));

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Periksa kembali data yang diisi.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const input = parsed.data;

  if (!(await categoryExists(input.categoryId))) {
    return {
      status: 'error',
      message: 'Periksa kembali data yang diisi.',
      fieldErrors: { categoryId: 'Kategori tidak ditemukan.' },
    };
  }

  const slug = await resolveUniqueSlug(input.name);
  const specifications = specificationsToJson(input.specifications);

  try {
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

    // Straight to the edit screen so the admin can review what was saved.
    redirect(`/admin/produk/${created.id}/edit?created=1`);
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

  const existing = await getAdminProductById(productId);
  if (!existing) {
    return {
      status: 'error',
      message: 'Produk tidak ditemukan.',
    };
  }

  const parsed = updateProductSchema.safeParse(readFormData(formData));

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Periksa kembali data yang diisi.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const input = parsed.data;

  if (!(await categoryExists(input.categoryId))) {
    return {
      status: 'error',
      message: 'Periksa kembali data yang diisi.',
      fieldErrors: { categoryId: 'Kategori tidak ditemukan.' },
    };
  }

  const specifications = specificationsToJson(input.specifications);

  try {
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

export async function deleteProduct(productId: number): Promise<void> {
  if (!(await requireAdminEditor())) {
    redirect('/admin/produk');
    return;
  }

  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (existing) {
    // ProductImage rows are removed by the schema's ON DELETE CASCADE.
    await prisma.product.delete({ where: { id: productId } });
  }

  revalidatePath('/admin/produk');
  revalidatePath('/');

  redirect('/admin/produk');
}
