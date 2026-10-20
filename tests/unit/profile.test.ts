import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

const authMock = vi.hoisted(() => vi.fn());
const profileDataMocks = vi.hoisted(() => ({
  getAdminProfileWithPasswordHash: vi.fn(),
  updateAdminProfile: vi.fn(),
  updateAdminPassword: vi.fn(),
}));
const passwordMocks = vi.hoisted(() => ({
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
}));
const rateLimitMocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  recordFailedAttempt: vi.fn(),
  resetAttempts: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('@/auth.config', () => ({ isAdminRole: () => true }));
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));
vi.mock('@/lib/data/admin/profile', () => profileDataMocks);
vi.mock('@/lib/db/password', () => passwordMocks);
vi.mock('@/lib/auth/rate-limiter', () => rateLimitMocks);
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { profileSchema, passwordSchema } from '@/lib/validation/profile';
import { updateProfile, updatePassword } from '@/app/(admin)/admin/(dashboard)/profil/actions';

describe('profile validation', () => {
  it('accepts a valid profile', () => {
    const result = profileSchema.safeParse({
      name: 'Admin Studio',
      email: 'ADMIN@EXAMPLE.COM',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('admin@example.com');
      expect(result.data.name).toBe('Admin Studio');
    }
  });

  it('rejects a short name', () => {
    expect(profileSchema.safeParse({ name: 'A', email: 'a@example.com' }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(profileSchema.safeParse({ name: 'Admin', email: 'bukan-email' }).success).toBe(false);
  });

  it('accepts a valid password change', () => {
    const result = passwordSchema.safeParse({
      currentPassword: 'password-lama',
      newPassword: 'password-baru-123',
      confirmPassword: 'password-baru-123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a 7-character new password', () => {
    expect(
      passwordSchema.safeParse({
        currentPassword: 'password-lama',
        newPassword: 'pendek1',
        confirmPassword: 'pendek1',
      }).success
    ).toBe(false);
  });

  it('accepts an 8-character new password', () => {
    expect(
      passwordSchema.safeParse({
        currentPassword: 'password-lama',
        newPassword: 'password',
        confirmPassword: 'password',
      }).success
    ).toBe(true);
  });

  it('rejects mismatched confirmation', () => {
    expect(
      passwordSchema.safeParse({
        currentPassword: 'password-lama',
        newPassword: 'password-baru-123',
        confirmPassword: 'berbeda-123',
      }).success
    ).toBe(false);
  });
});

describe('profile server actions', () => {
  beforeEach(() => {
    authMock.mockReset();
    profileDataMocks.getAdminProfileWithPasswordHash.mockReset();
    profileDataMocks.updateAdminProfile.mockReset();
    profileDataMocks.updateAdminPassword.mockReset();
    passwordMocks.verifyPassword.mockReset();
    passwordMocks.hashPassword.mockReset();
    rateLimitMocks.checkRateLimit.mockReset();
    rateLimitMocks.recordFailedAttempt.mockReset();
    rateLimitMocks.resetAttempts.mockReset();

    rateLimitMocks.checkRateLimit.mockReturnValue({ allowed: true, remaining: 1 });
  });

  it('rejects profile update without session', async () => {
    authMock.mockResolvedValue(null);
    const result = await updateProfile({ status: 'idle' }, new FormData());
    expect(result.status).toBe('error');
    expect(result.message).toBe('Anda tidak memiliki akses.');
  });

  it('rejects password change when current password is wrong', async () => {
    authMock.mockResolvedValue({ user: { id: '1', role: 'ADMIN' } });
    profileDataMocks.getAdminProfileWithPasswordHash.mockResolvedValue({
      id: 1,
      name: 'Admin',
      email: 'admin@example.com',
      passwordHash: 'stored-hash',
    });
    passwordMocks.verifyPassword.mockResolvedValue(false);

    const formData = new FormData();
    formData.set('currentPassword', 'salah');
    formData.set('newPassword', 'password-baru-123');
    formData.set('confirmPassword', 'password-baru-123');

    const result = await updatePassword({ status: 'idle' }, formData);
    expect(result.status).toBe('error');
    expect(result.fieldErrors?.currentPassword).toBe('Password saat ini salah.');
    expect(rateLimitMocks.recordFailedAttempt).toHaveBeenCalled();
  });

  it('handles duplicate email on profile update', async () => {
    authMock.mockResolvedValue({ user: { id: '1', role: 'ADMIN' } });
    profileDataMocks.getAdminProfileWithPasswordHash.mockResolvedValue({
      id: 1,
      name: 'Admin',
      email: 'lama@example.com',
      passwordHash: 'stored-hash',
    });
    passwordMocks.verifyPassword.mockResolvedValue(true);
    profileDataMocks.updateAdminProfile.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
      })
    );

    const formData = new FormData();
    formData.set('name', 'Admin Baru');
    formData.set('email', 'baru@example.com');
    formData.set('currentPassword', 'password-lama');

    const result = await updateProfile({ status: 'idle' }, formData);
    expect(result.status).toBe('error');
    expect(result.fieldErrors?.email).toBe('Email sudah digunakan.');
  });
});