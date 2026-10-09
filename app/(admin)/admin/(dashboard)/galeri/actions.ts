'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { isAdminRole } from '@/auth.config';
import { prisma } from '@/lib/db/prisma';
import {
  getAdminGalleryItemById,
  moveGalleryItemBy,
} from '@/lib/data/admin/gallery';
import {
  createGalleryItemSchema,
  toGalleryImageColumns,
  updateGalleryItemSchema,
} from '@/lib/validation/gallery';

/**
 * Gallery mutations for the admin area.
 *
 * Every action repeats the same two checks the rest of the admin area performs
 * before touching the database:
 *   1. a valid session exists (nothing the client sent is trusted)
 *   2. the role is ADMIN or EDITOR
 *
 * The session is read here rather than inferred from the fact that the admin can
 * see the form: hiding a control is not authorization, and these actions are
 * ordinary POST targets.
 *
 * Input is validated with Zod on the server. The form's HTML attributes are a
 * usability aid only.
 *
 * Results are structured so the client form can render Indonesian messages without
 * a full page reload. Raw Prisma or database errors never reach the browser.
 */

/** Shared error sentinel returned by every mutation. */
type ErrorResult = { success: false; error: string; field?: string };

/** Success payload returned by every mutation. */
type SuccessResult = {
  success: true;
  data: {
    id: number;
    title: string;
    /**
     * True only when this save replaced the photograph with a different one.
     *
     * The form re-submits the existing url/publicId when the admin edits metadata
     * alone, so without this flag an edit would also claim to have replaced the
     * photo - and warn about a "previous" image that never changed.
     */
    imageReplaced: boolean;
  };
};

export type GalleryActionResult = SuccessResult | ErrorResult;

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Returns true only when the caller holds an ADMIN or EDITOR session. */
async function requireAdminEditor(): Promise<boolean> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !isAdminRole(user.role)) return false;

  return true;
}

/**
 * Invalidates both the admin screens and the public page.
 *
 * `/galeri` is a storefront route read through the same Prisma DAL, so a photo
 * added or toggled in the admin has to reach the visitor's page without waiting
 * for a redeploy.
 */
function revalidateGalleryViews() {
  revalidatePath('/admin/galeri');
  revalidatePath('/galeri');
}

/** Reads a form field as a trimmed string, treating a missing entry as blank. */
function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

/** Turns a Zod failure into the flat `{ error, field }` the form renders. */
function toValidationError(error: {
  issues: { message: string; path: PropertyKey[] }[];
}): ErrorResult {
  const issue = error.issues[0];

  return {
    success: false,
    error: issue.message,
    field: String(issue.path[0] ?? ''),
  };
}

/** Reads and validates the shared form fields. */
function parseGalleryForm(formData: FormData) {
  return {
    title: readString(formData, 'title'),
    description: readString(formData, 'description'),
    imageUrl: readString(formData, 'imageUrl'),
    publicId: readString(formData, 'publicId'),
    altText: readString(formData, 'altText'),
    sortOrder: readString(formData, 'sortOrder'),
    // An unchecked checkbox is simply absent from the submission, which is what
    // makes deactivating a photo work without a second control.
    isActive: formData.get('isActive') === 'on',
  };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createGalleryItem(
  _prevState: GalleryActionResult,
  formData: FormData
): Promise<GalleryActionResult> {
  if (!(await requireAdminEditor())) {
    return {
      success: false,
      error: 'Anda tidak diotorisasi untuk melakukan action ini.',
    };
  }

  const parsed = createGalleryItemSchema.safeParse(parseGalleryForm(formData));

  if (!parsed.success) {
    return toValidationError(parsed.error);
  }

  const data = parsed.data;

  try {
    const created = await prisma.galleryImage.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        ...toGalleryImageColumns(data),
        altText: data.altText ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive,
      },
      select: { id: true, title: true },
    });

    revalidateGalleryViews();

    return {
      success: true,
      data: { id: created.id, title: created.title, imageReplaced: false },
    };
  } catch {
    // Never surface a raw Prisma error to the browser.
    return {
      success: false,
      error: 'Gagal menyimpan foto galeri. Silakan coba lagi.',
    };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateGalleryItem(
  _prevState: GalleryActionResult,
  formData: FormData
): Promise<GalleryActionResult> {
  if (!(await requireAdminEditor())) {
    return {
      success: false,
      error: 'Anda tidak diotorisasi untuk melakukan action ini.',
    };
  }

  // The id travels as a form field rather than being bound to the action, so both
  // modes share one unbound signature. It is validated before it reaches Prisma.
  const id = Number(readString(formData, 'id'));

  if (!Number.isInteger(id) || id <= 0) {
    return { success: false, error: 'Foto galeri tidak ditemukan.' };
  }

  const existing = await getAdminGalleryItemById(id);

  if (!existing) {
    return { success: false, error: 'Foto galeri tidak ditemukan.' };
  }

  const parsed = updateGalleryItemSchema.safeParse(parseGalleryForm(formData));

  if (!parsed.success) {
    return toValidationError(parsed.error);
  }

  const data = parsed.data;

  /*
   * IMAGE HANDLING
   * The submitted fields are authoritative, which is what makes "keep the current
   * photo" and "replace the photo" the same code path: the uploader re-submits
   * the stored url/publicId unless the admin picked or removed a file.
   *
   * Comparing against the stored value is what distinguishes the two outcomes, so
   * the follow-up warning about an orphaned Cloudinary asset fires on a genuine
   * replacement and never on a metadata-only edit.
   *
   * Replacing a photo deliberately leaves the previous asset in Cloudinary.
   * Deleting remote media needs a trusted server-side context this codebase does
   * not have, and losing a photo the admin may still want is worse than leaving an
   * unreferenced asset for a later cleanup pass.
   */
  const imageReplaced = data.imageUrl !== existing.imageUrl;

  try {
    const updated = await prisma.galleryImage.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description ?? null,
        ...toGalleryImageColumns(data),
        altText: data.altText ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive,
      },
      select: { id: true, title: true },
    });

    revalidateGalleryViews();
    revalidatePath(`/admin/galeri/${id}/edit`);

    return {
      success: true,
      data: { id: updated.id, title: updated.title, imageReplaced },
    };
  } catch {
    return {
      success: false,
      error: 'Gagal mengupdate foto galeri. Silakan coba lagi.',
    };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Deletes one gallery photograph.
 *
 * Returns the same structured result as the other gallery mutations so the
 * confirm dialog can keep the dialog open and show the reason on failure, and
 * raise a toast on success.
 *
 * CLOUINARY ASSETS ARE NOT DELETED
 * This only removes the database row. The remote asset stays in the
 * `studio-marmer/gallery` media library for a later trusted cleanup pass,
 * exactly as replacing a photo behaves today.
 */
export async function deleteGalleryItem(
  id: number
): Promise<GalleryActionResult> {
  if (!(await requireAdminEditor())) {
    return {
      success: false,
      error: 'Anda tidak diotorisasi untuk melakukan action ini.',
    };
  }

  if (!Number.isInteger(id) || id <= 0) {
    return { success: false, error: 'Foto galeri tidak ditemukan.' };
  }

  try {
    const existing = await prisma.galleryImage.findUnique({
      where: { id },
      select: { title: true },
    });

    // A row that is already gone is treated as success: the admin asked for it to
    // be absent, and it is. Reporting an error here would punish a double-click.
    if (!existing) {
      return { success: true, data: { id, title: '', imageReplaced: false } };
    }

    await prisma.galleryImage.delete({ where: { id } });

    revalidateGalleryViews();

    return {
      success: true,
      data: { id, title: existing.title, imageReplaced: false },
    };
  } catch {
    // Never surface a raw Prisma error to the browser.
    return {
      success: false,
      error: 'Gagal menghapus foto galeri. Silakan coba lagi.',
    };
  }
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

/**
 * Moves one photo one place up or down in the gallery order.
 *
 * The ordering rule itself — why a swap rather than an increment, and how two rows
 * sharing a `sortOrder` are handled — lives in `moveGalleryItemBy`
 * (lib/data/admin/gallery.ts). This action is the authorization and
 * notification shell around it: session check, argument validation, revalidation,
 * and an Indonesian outcome for every branch.
 */
export async function moveGalleryItem(
  id: number,
  direction: -1 | 1
): Promise<GalleryActionResult> {
  if (!(await requireAdminEditor())) {
    return {
      success: false,
      error: 'Anda tidak diotorisasi untuk melakukan action ini.',
    };
  }

  if (!Number.isInteger(id) || id <= 0) {
    return { success: false, error: 'Foto galeri tidak ditemukan.' };
  }

  // Reject anything other than a single-step move at the boundary rather than
  // letting an unrecognised value reach the ordering logic.
  if (direction !== -1 && direction !== 1) {
    return { success: false, error: 'Permintaan urutan tidak valid.' };
  }

  try {
    const outcome = await moveGalleryItemBy(id, direction);

    if (outcome.status === 'not-found') {
      return { success: false, error: 'Foto galeri tidak ditemukan.' };
    }

    revalidateGalleryViews();

    // `edge` reports success as well: the photo was already at that end of the
    // sequence, which is what the admin asked for. Raising an error there would
    // punish a double-click with something they cannot act on.
    return {
      success: true,
      data: { id: outcome.id, title: '', imageReplaced: false },
    };
  } catch {
    // Never surface a raw Prisma error to the browser.
    return {
      success: false,
      error: 'Gagal mengubah urutan foto galeri. Silakan coba lagi.',
    };
  }
}