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

export type ProductFormState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  /** Field-level messages, keyed by form field name. */
  fieldErrors?: Record<string, string>;
};

export const IDLE_STATE: ProductFormState = { status: 'idle' };

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

  const images: { imageUrl: string; altText: string }[] = [];
  for (let i = 0; ; i += 1) {
    const imageUrl = getString(`image_${i}_url`);
    const altText = getString(`image_${i}_alt`);
    if (!imageUrl && !altText && i > 24) break;
    images.push({ imageUrl, altText });
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

      // Replace the gallery wholesale so reorder and removal take effect
      // immediately. Rows are deleted explicitly rather than relying only on
      // the cascade, which keeps intent obvious.
      await tx.productImage.deleteMany({ where: { productId } });
      await tx.productImage.createMany({
        data: input.images.map((image, index) => ({
          productId,
          imageUrl: image.imageUrl,
          altText: image.altText ?? null,
          sortOrder: index,
        })),
      });
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
