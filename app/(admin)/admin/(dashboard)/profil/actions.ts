'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { auth } from '@/auth';
import { isAdminRole } from '@/auth.config';
import { Prisma } from '@prisma/client';

import {
  getAdminProfileWithPasswordHash,
  updateAdminProfile,
  updateAdminPassword,
} from '@/lib/data/admin/profile';
import { profileSchema, passwordSchema } from '@/lib/validation/profile';
import { hashPassword, verifyPassword } from '@/lib/db/password';
import {
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts,
} from '@/lib/auth/rate-limiter';

import type { ProfileFormState, PasswordFormState } from './state';

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

function readProfileFormData(formData: FormData) {
  const get = (key: string): string => {
    const value = formData.get(key);
    return typeof value === 'string' ? value : '';
  };

  return {
    name: get('name'),
    email: get('email'),
    currentPassword: get('currentPassword'),
  };
}

function readPasswordFormData(formData: FormData) {
  const get = (key: string): string => {
    const value = formData.get(key);
    return typeof value === 'string' ? value : '';
  };

  return {
    currentPassword: get('currentPassword'),
    newPassword: get('newPassword'),
    confirmPassword: get('confirmPassword'),
  };
}

async function requireAdmin() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !isAdminRole(user.role)) return null;
  return user;
}

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const sessionUser = await requireAdmin();
  if (!sessionUser) {
    return { status: 'error', message: 'Anda tidak memiliki akses.' };
  }

  const userId = Number(sessionUser.id);
  const user = await getAdminProfileWithPasswordHash(userId);
  if (!user) {
    return { status: 'error', message: 'Akun tidak ditemukan.' };
  }

  const parsed = profileSchema.safeParse(readProfileFormData(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Periksa kembali data yang diisi.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;
  const emailChanged = data.email !== user.email;

  if (emailChanged) {
    if (!data.currentPassword) {
      return {
        status: 'error',
        message: 'Periksa kembali data yang diisi.',
        fieldErrors: { currentPassword: 'Password saat ini wajib diisi jika email diubah.' },
      };
    }

    const request = new Request('http://localhost/admin/profil', {
      headers: await headers(),
    });
    const rateLimit = checkRateLimit(request, user.email);
    if (!rateLimit.allowed) {
      return {
        status: 'error',
        message: 'Terlalu banyak percobaan. Silakan coba lagi nanti.',
      };
    }

    const passwordValid = await verifyPassword(data.currentPassword, user.passwordHash);
    if (!passwordValid) {
      recordFailedAttempt(request, user.email);
      return {
        status: 'error',
        message: 'Periksa kembali data yang diisi.',
        fieldErrors: { currentPassword: 'Password saat ini salah.' },
      };
    }

    resetAttempts(request, user.email);
  }

  try {
    await updateAdminProfile(userId, {
      name: data.name,
      email: data.email,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        status: 'error',
        message: 'Periksa kembali data yang diisi.',
        fieldErrors: { email: 'Email sudah digunakan.' },
      };
    }
    return {
      status: 'error',
      message: 'Profil gagal disimpan. Silakan coba lagi.',
    };
  }

  revalidatePath('/admin/profil');
  revalidatePath('/admin');

  return {
    status: 'success',
    message: 'Profil berhasil diperbarui.',
  };
}

export async function updatePassword(
  _prevState: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const sessionUser = await requireAdmin();
  if (!sessionUser) {
    return { status: 'error', message: 'Anda tidak memiliki akses.' };
  }

  const userId = Number(sessionUser.id);
  const user = await getAdminProfileWithPasswordHash(userId);
  if (!user) {
    return { status: 'error', message: 'Akun tidak ditemukan.' };
  }

  const parsed = passwordSchema.safeParse(readPasswordFormData(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Periksa kembali data yang diisi.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const request = new Request('http://localhost/admin/profil', {
    headers: await headers(),
  });
  const rateLimit = checkRateLimit(request, user.email);
  if (!rateLimit.allowed) {
    return {
      status: 'error',
      message: 'Terlalu banyak percobaan. Silakan coba lagi nanti.',
    };
  }

  const currentPasswordValid = await verifyPassword(
    data.currentPassword,
    user.passwordHash
  );
  if (!currentPasswordValid) {
    recordFailedAttempt(request, user.email);
    return {
      status: 'error',
      message: 'Periksa kembali data yang diisi.',
      fieldErrors: { currentPassword: 'Password saat ini salah.' },
    };
  }

  if (data.newPassword === data.currentPassword) {
    return {
      status: 'error',
      message: 'Periksa kembali data yang diisi.',
      fieldErrors: { newPassword: 'Password baru harus berbeda dari password saat ini.' },
    };
  }

  resetAttempts(request, user.email);

  const newHash = await hashPassword(data.newPassword);

  try {
    await updateAdminPassword(userId, newHash);
  } catch {
    return {
      status: 'error',
      message: 'Password gagal diubah. Silakan coba lagi.',
    };
  }

  revalidatePath('/admin/profil');

  return {
    status: 'success',
    message: 'Password berhasil diubah. Disarankan keluar lalu masuk lagi.',
  };
}