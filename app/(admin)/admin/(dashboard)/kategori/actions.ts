'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import {
  createCategorySchema,
  updateCategorySchema,
  toCategoryImageColumns,
} from '@/lib/validation/category'
import { resolveUniqueCategorySlug } from '@/lib/data/admin/categories'
import { auth } from '@/auth'
import { isAdminRole } from '@/auth.config'

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
 *  Shared helpers
 * --------------------------------------------------------------- */

/**
 * Returns true only when the caller holds a valid ADMIN or EDITOR session.
 *
 * The role always comes from the signed JWT, never from anything the client
 * sent alongside the form.
 */
async function requireAdminEditor(): Promise<boolean> {
  const session = await auth()
  const user = session?.user

  if (!user?.id || !isAdminRole(user.role)) return false

  return true
}

/**
 * The storefront renders categories inside the statically prerendered home
 * page, so every mutation has to invalidate it explicitly. Without this a new
 * or renamed category would not appear on the customer site until a redeploy.
 */
function revalidateCategoryViews() {
  revalidatePath('/admin/kategori')
  revalidatePath('/admin/kategori/tambah')
  revalidatePath('/')
}

/** Reads a form field as a trimmed string, treating a missing entry as blank. */
function readString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

/** ---------------------------------------------------------------
 *  CREATE
 * --------------------------------------------------------------- */
export async function createCategory(
  _prevState: CategoryActionResult,
  formData: FormData
): Promise<CategoryActionResult> {
  // ---- session / role guard -------------------------------------------------
  if (!(await requireAdminEditor())) {
    return { success: false, error: 'Anda tidak diotorisasi untuk melakukan action ini.' }
  }

  // ---- Zod validation -------------------------------------------------------
  const raw = {
    name: readString(formData, 'name'),
    description: readString(formData, 'description'),
    imageUrl: readString(formData, 'imageUrl'),
    publicId: readString(formData, 'publicId'),
    sortOrder: readString(formData, 'sortOrder'),
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

  const data = result.data

  // ---- generate deterministic, unique slug -----------------------------------
  const slug = await resolveUniqueCategorySlug(data.name)

  // ---- persist --------------------------------------------------------------
  try {
    const created = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description ?? null,
        // imageUrl and publicId always move together: an uploaded image brings
        // both, and clearing the image clears both.
        ...toCategoryImageColumns(data),
        sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : 0,
        isActive: data.isActive ?? true,
      },
      select: { id: true, name: true, slug: true },
    })

    revalidateCategoryViews()

    return {
      success: true,
      data: { id: created.id, name: created.name, slug: created.slug },
    }
  } catch {
    // Do not leak raw Prisma errors
    return { success: false, error: 'Gagal menyimpan kategori. Silakan coba lagi.' }
  }
}

/** ---------------------------------------------------------------
 *  UPDATE
 * --------------------------------------------------------------- */
export async function updateCategory(
  _prevState: CategoryActionResult,
  formData: FormData
): Promise<CategoryActionResult> {
  // ---- session / role guard -------------------------------------------------
  if (!(await requireAdminEditor())) {
    return { success: false, error: 'Anda tidak diotorisasi untuk melakukan action ini.' }
  }

  // The id is read from the form rather than bound to the action, so a forged
  // field is validated before it can reach the database.
  const id = Number(readString(formData, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    return { success: false, error: 'Kategori tidak ditemukan.' }
  }

  // ---- Zod validation -------------------------------------------------------
  const raw = {
    name: readString(formData, 'name'),
    description: readString(formData, 'description'),
    imageUrl: readString(formData, 'imageUrl'),
    publicId: readString(formData, 'publicId'),
    sortOrder: readString(formData, 'sortOrder'),
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

  const data = result.data

  // ---- the slug is read only to report it back and to prove the row exists ---
  const existing = await prisma.category.findUnique({
    where: { id },
    select: { slug: true },
  })

  if (!existing) {
    return { success: false, error: 'Kategori tidak ditemukan.' }
  }

  // ---- apply updates, keeping the original slug ------------------------------
  //
  // IMAGE HANDLING
  // The submitted image fields are authoritative: keeping the existing photo is
  // simply a matter of the form re-submitting its values, and removing it is
  // submitting blanks. So this writes the pair as given rather than special
  // casing "unchanged".
  //
  // Replacing an image leaves the previous Cloudinary asset in place. Deleting
  // remote media needs a trusted server-side context that this codebase does not
  // have yet, and losing a photo the admin may still want is far worse than
  // leaving an unreferenced asset for later cleanup.
  try {
    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description ?? null,
        ...toCategoryImageColumns(data),
        sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : undefined,
        isActive: data.isActive ?? true,
        // The slug is the public URL of the category: it is created once from
        // the first name and deliberately left untouched on every update.
      },
      select: { id: true, name: true },
    })

    revalidateCategoryViews()

    return {
      success: true,
      data: { id: updated.id, name: updated.name, slug: existing.slug },
    }
  } catch {
    return { success: false, error: 'Gagal mengupdate kategori. Silakan coba lagi.' }
  }
}

/** ---------------------------------------------------------------
 *  DELETE
 * --------------------------------------------------------------- */
export async function deleteCategory(id: number): Promise<CategoryActionResult> {
  // ---- session / role guard -------------------------------------------------
  if (!(await requireAdminEditor())) {
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

    revalidateCategoryViews()

    return { success: true, data: { id, name: '', slug: '' } }
  } catch {
    // Database RESTRICT will catch any stray referential issues
    return { success: false, error: 'Gagal menghapus kategori. Silakan coba lagi.' }
  }
}