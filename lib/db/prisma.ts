import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton for Next.js.
 *
 * In development, Next.js hot-reload re-evaluates modules on every change.
 * Without caching the instance on `globalThis`, each reload would open a new
 * connection pool until MySQL refuses new connections.
 *
 * The DATABASE_URL itself is never referenced here - it is read from the
 * environment by the generated Prisma Client, so credentials stay in `.env`
 * and are never bundled into client-side code.
 *
 * This module is imported only from Server Components / route handlers.
 * It must never be imported into a `'use client'` component, because doing so
 * would attempt to bundle the database driver into the browser.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
