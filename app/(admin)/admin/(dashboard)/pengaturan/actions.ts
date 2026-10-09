'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { isAdminRole } from '@/auth.config';
import {
  SITE_SETTINGS_ID,
  clearAdminSiteLogo,
  getAdminSiteSettings,
  updateAdminSiteSettings,
} from '@/lib/data/admin/site';
import { siteSettingsSchema } from '@/lib/validation/site-settings';
import { ADMIN_TOASTS } from '@/lib/admin/toast';

/**
 * Site settings mutation for the admin area.
 *
 * `site_settings` is a singleton row (id = 1), so there is exactly one action:
 * a full replace of the editable fields. There is no create and no delete.
 *
 * Before touching the database it repeats the same two checks every other
 * admin action performs:
 *   1. a valid session exists (nothing the client sends is trusted)
 *   2. the role is ADMIN or EDITOR
 *
 * Input is validated with Zod on the server, including WhatsApp normalisation.
 * The result is a structured state so the form can render Indonesian messages
 * without a full page reload; raw Prisma/database errors never reach the
 * browser.
 */

export type SiteSettingsFormState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  /** Field-level messages, keyed by form field name. */
  fieldErrors?: Record<string, string>;
  /**
   * Optional follow-up notice shown alongside a SUCCESS, never instead of it.
   *
   * It exists because replacing the hero photograph is only half the outcome:
   * the previous Cloudinary asset is deliberately left in the media library, and
   * that is a side effect the admin should hear about rather than discover later
   * as unexplained storage. Optional and additive, so the components reading
   * `message` and `fieldErrors` are unaffected.
   */
  warning?: string;
};

/** Returns true only when the caller holds an ADMIN or EDITOR session. */
async function requireAdminEditor(): Promise<boolean> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !isAdminRole(user.role)) return false;

  return true;
}

/** Turns a Zod failure into the flat field-error map the form expects. */
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

/** Reads the form's text fields. Every setting is submitted on each save. */
function readFormData(formData: FormData) {
  const getString = (key: string): string => {
    const value = formData.get(key);
    return typeof value === 'string' ? value : '';
  };

  return {
    siteName: getString('siteName'),
    logoUrl: getString('logoUrl'),
    logoPublicId: getString('logoPublicId'),
    whatsappNumber: getString('whatsappNumber'),
    email: getString('email'),
    address: getString('address'),
    shopeeUrl: getString('shopeeUrl'),
    instagramUrl: getString('instagramUrl'),
    tiktokUrl: getString('tiktokUrl'),
    heroTitle: getString('heroTitle'),
    heroSubtitle: getString('heroSubtitle'),
    heroImageUrl: getString('heroImageUrl'),
    heroImagePublicId: getString('heroImagePublicId'),
  };
}

export async function updateSiteSettings(
  _prevState: SiteSettingsFormState,
  formData: FormData
): Promise<SiteSettingsFormState> {
  if (!(await requireAdminEditor())) {
    return {
      status: 'error',
      message: 'Anda tidak memiliki akses untuk mengubah pengaturan.',
    };
  }

  const parsed = siteSettingsSchema.safeParse(readFormData(formData));

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Periksa kembali data yang diisi.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    /*
     * Read the row before writing it.
     *
     * A settings save almost always submits every field, so "did the hero
     * photograph actually change?" cannot be answered from the submission alone
     * — re-uploading nothing submits the same URL it already held. Comparing
     * against the stored value is what makes the warning below accurate instead
     * of firing on every save, and it costs one primary-key lookup on an action
     * an admin performs a handful of times a day.
     */
    const previous = await getAdminSiteSettings();
    const previousHeroImageUrl = previous.settings?.heroImageUrl ?? null;

    await updateAdminSiteSettings(parsed.data);

    // The storefront reads settings in the root store layout, the hero, the
    // navbar/footer and the contact page, so the whole storefront tree plus the
    // settings screen itself is revalidated.
    revalidatePath('/', 'layout');
    revalidatePath('/admin/pengaturan');

    const heroImageChanged =
      (parsed.data.heroImageUrl ?? null) !== previousHeroImageUrl;

    return {
      status: 'success',
      message: 'Pengaturan berhasil disimpan.',
      // Copy comes from the shared catalogue rather than being written inline,
      // so this sentence cannot drift from the notification raised anywhere
      // else for the same action.
      warning: heroImageChanged
        ? ADMIN_TOASTS['gambar-hero-diperbarui'].message
        : undefined,
    };
  } catch {
    // Never surface a raw Prisma error to the browser.
    return {
      status: 'error',
      message: 'Pengaturan gagal disimpan. Silakan coba lagi.',
    };
  }
}

/**
 * Clears the site logo on its own, without a form submit.
 *
 * WHY A SEPARATE ACTION
 * The logo is a large image inside an otherwise text-heavy form, and "remove it"
 * is a distinct intent from "save my contact details". Requiring a full save to
 * drop it means the admin has to wonder whether unsaved edits elsewhere are about
 * to be written too. This action touches the two logo columns and nothing else,
 * so it can never take a partially-typed settings row with it.
 *
 * It is idempotent and races safely: the two columns are nulled by id, so a
 * double-click cannot blank anything but the logo.
 *
 * CLOUINARY ASSETS ARE NOT DELETED
 * This only unlinks the reference. Deleting the remote asset would need the API
 * secret, which must never reach a client bundle or this file, and would be
 * irreversible if the admin wanted the logo back. The orphaned asset stays in the
 * `studio-marmer/site` media library for a later trusted cleanup pass, exactly
 * as replacing an image behaves today.
 *
 * No `heroImage*` column is touched: removing the logo must not disturb the hero
 * photograph, and vice versa.
 */
export async function removeSiteLogo(): Promise<SiteSettingsFormState> {
  if (!(await requireAdminEditor())) {
    return {
      status: 'error',
      message: 'Anda tidak memiliki akses untuk menghapus logo.',
    };
  }

  try {
    await clearAdminSiteLogo(SITE_SETTINGS_ID);

    revalidatePath('/', 'layout');
    revalidatePath('/admin/pengaturan');

    return {
      status: 'success',
      message: 'Logo dihapus dari pengaturan. Situs kembali menampilkan wordmark.',
    };
  } catch {
    return {
      status: 'error',
      message: 'Logo gagal dihapus. Silakan coba lagi.',
    };
  }
}