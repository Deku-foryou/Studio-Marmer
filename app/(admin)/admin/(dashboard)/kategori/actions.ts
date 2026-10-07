'use server'

import { prisma } from '@/lib/db/prisma'
import { createCategorySchema, updateCategorySchema } from '@/lib/validation/category'
import { resolveUniqueCategorySlug } from '@/lib/data/admin/categories'
import { auth } from '@/auth'

/** Shared error sentinel returned by every mutation. */
type ErrorResult = { success: false; error: string; field?: string }

/** Success payload returned by every mutation. */
type SuccessResult = {
  success: true
  data: {
    id: number
    name: string
    slug: string
  }
}

export type CategoryActionResult = SuccessResult | ErrorResult

/** ---------------------------------------------------------------
 *  CREATE
 * --------------------------------------------------------------- */
export async function createCategory(formData: FormData): Promise<CategoryActionResult> {
  // ---- session / role guard -------------------------------------------------
  const session = await auth()
  if (!session || !['ADMIN', 'EDITOR'].includes(session.user.role as string)) {
    return { success: false, error: 'Anda tidak diotorisasi untuk melakukan action ini.' }
  }

  // ---- Zod validation -------------------------------------------------------
  const raw = {
    name: String(formData.get('name') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    imageUrl: String(formData.get('imageUrl') ?? '').trim(),
    sortOrder: formData.get('sortOrder') !== null ? Number(formData.get('sortOrder')) : undefined,
    isActive: formData.get('isActive') === 'on',
  }

  const result = createCategorySchema.safeParse(raw)

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0].message,
      field: result.error.issues[0].path[0] as string,
    }
  }

  const data = result.data // typed as createCategorySchema._output

  // ---- generate deterministic, unique slug -----------------------------------
  const slug = await resolveUniqueCategorySlug(data.name)

  // ---- persist --------------------------------------------------------------
  try {
    const created = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description !== '' ? data.description : undefined,
        imageUrl: data.imageUrl !== '' ? data.imageUrl : undefined,
        sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : 0,
        isActive: data.isActive,
      },
      select: { id: true, name: true, slug: true },
    })

    return {
      success: true,
      data: { id: created.id, name: created.name, slug: created.slug },
    }
  } catch (e) {
    // Do not leak raw Prisma errors
    return { success: false, error: 'Gagal menyimpan kategori. Silakan coba lagi.' }
  }
}

/** ---------------------------------------------------------------
 *  UPDATE
 * --------------------------------------------------------------- */
export async function updateCategory(
  id: number,
  formData: FormData
): Promise<CategoryActionResult> {
  // ---- session / role guard -------------------------------------------------
  const session = await auth()
  if (!session || !['ADMIN', 'EDITOR'].includes(session.user.role as string)) {
    return { success: false, error: 'Anda tidak diotorisasi untuk melakukan action ini.' }
  }

  // ---- Zod validation -------------------------------------------------------
  const raw = {
    name: formData.get('name') ? String(formData.get('name')).trim() : undefined,
    description:
      formData.get('description') !== null
        ? String(formData.get('description')).trim()
        : undefined,
    imageUrl: formData.get('imageUrl') ? String(formData.get('imageUrl')).trim() : undefined,
    sortOrder:
      formData.get('sortOrder') !== null ? String(formData.get('sortOrder')).trim() : undefined,
    isActive: formData.get('isActive') === 'on',
  }

  const result = updateCategorySchema.safeParse(raw)

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0].message,
      field: result.error.issues[0].path[0] as string,
    }
  }

  const data = result.data // typed as updateCategorySchema._output

  // ---- preserve existing slug - do NOT regenerate ----------------------------
  const existing = await prisma.category.findUnique({
    where: { id },
    select: { slug: true },
  })

  if (!existing) {
    return { success: false, error: 'Kategori tidak ditemukan.' }
  }

  const slugToPreserve = existing.slug

  // ---- apply updates, keeping the original slug ------------------------------
  try {
    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description !== '' ? data.description : undefined,
        imageUrl: data.imageUrl !== '' ? data.imageUrl : undefined,
        sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : undefined,
        isActive: data.isActive,
        // explicitly keep the slug unchanged
        slug: slugToPreserve,
      },
      select: { id: true, name: true, slug: true },
    })

    return {
      success: true,
      data: { id: updated.id, name: updated.name, slug: updated.slug },
    }
  } catch (e) {
    return { success: false, error: 'Gagal mengupdate kategori. Silakan coba lagi.' }
  }
}

/** ---------------------------------------------------------------
 *  DELETE
 * --------------------------------------------------------------- */
export async function deleteCategory(id: number): Promise<CategoryActionResult> {
  // ---- session / role guard -------------------------------------------------
  const session = await auth()
  if (!session || !['ADMIN', 'EDITOR'].includes(session.user.role as string)) {
    return { success: false, error: 'Anda tidak diotorisasi untuk melakukan action ini.' }
  }

  // ---- check product count before delete ------------------------------------
  const count = await prisma.product.count({
    where: { categoryId: id },
  })

  // ---- if products exist, reject with Indonesian message ----------------------
  if (count > 0) {
    return {
      success: false,
      error: 'Kategori tidak dapat dihapus karena masih digunakan oleh produk.',
    }
  }

  // ---- no products, safe to delete -------------------------------------------
  try {
    await prisma.category.delete({
      where: { id },
    })
    return { success: true, data: { id, name: '', slug: '' } }
  } catch (e) {
    // Database RESTRICT will catch any stray referential issues
    return { success: false, error: 'Gagal menghapus kategori. Silakan coba lagi.' }
  }
}