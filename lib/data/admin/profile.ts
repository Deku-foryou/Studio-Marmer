import { prisma } from '@/lib/db/prisma';

export interface AdminProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getAdminProfile(userId: number): Promise<AdminProfile | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getAdminProfileWithPasswordHash(userId: number): Promise<
  | (AdminProfile & { passwordHash: string })
  | null
> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      passwordHash: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateAdminProfile(
  userId: number,
  input: { name: string; email: string }
): Promise<AdminProfile> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      email: input.email,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateAdminPassword(
  userId: number,
  passwordHash: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}