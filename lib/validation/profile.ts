import { z } from 'zod';

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nama minimal 2 karakter.')
    .max(80, 'Nama maksimal 80 karakter.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(255, 'Email maksimal 255 karakter.')
    .email('Format email tidak valid.'),
  currentPassword: z
    .string()
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi.'),
    newPassword: z
      .string()
      .min(8, 'Password baru minimal 8 karakter.')
      .max(1024, 'Password baru terlalu panjang.'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi password tidak sama.',
    path: ['confirmPassword'],
  });

export type PasswordInput = z.infer<typeof passwordSchema>;