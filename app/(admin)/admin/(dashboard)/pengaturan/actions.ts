'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { isAdminRole } from '@/auth.config';
import { updateAdminSiteSettings } from '@/lib/data/admin/site';
import { siteSettingsSchema } from '@/lib/validation/site-settings';

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
    whatsappNumber: getString('whatsappNumber'),
    email: getString('email'),
    address: getString('address'),
    shopeeUrl: getString('shopeeUrl'),
    instagramUrl: getString('instagramUrl'),
    tiktokUrl: getString('tiktokUrl'),
    heroTitle: getString('heroTitle'),
    heroSubtitle: getString('heroSubtitle'),
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
    await updateAdminSiteSettings(parsed.data);

    // The storefront reads settings in the root store layout, the hero, the
    // navbar/footer and the contact page, so the whole storefront tree plus the
    // settings screen itself is revalidated.
    revalidatePath('/', 'layout');
    revalidatePath('/admin/pengaturan');

    return {
      status: 'success',
      message: 'Pengaturan berhasil disimpan.',
    };
  } catch {
    // Never surface a raw Prisma error to the browser.
    return {
      status: 'error',
      message: 'Pengaturan gagal disimpan. Silakan coba lagi.',
    };
  }
}