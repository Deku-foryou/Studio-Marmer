import type { NextAuthConfig } from 'next-auth';

/**
 * Lightweight Auth.js configuration.
 *
 * This file is intentionally free of Prisma (and of any Node-only module) so it
 * is safe to import from `proxy.ts`, which Next.js 16 runs in a separate,
 * optimised context that must not rely on shared modules or database drivers.
 *
 * The Credentials provider - the only part that touches the database - lives in
 * `auth.ts`.
 */

/** Roles permitted to authenticate into the admin area. */
export const ADMIN_ROLES = ['ADMIN', 'EDITOR'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(value: unknown): value is AdminRole {
  return (
    typeof value === 'string' &&
    (ADMIN_ROLES as readonly string[]).includes(value)
  );
}

export const authConfig = {
  /**
   * Custom admin sign-in page. Auth.js redirects unauthenticated users here
   * instead of rendering its own built-in form.
   */
  pages: {
    signIn: '/admin/login',
  },

  /**
   * JWT sessions: no `sessions` / `accounts` / `verification_tokens` tables are
   * required, so the existing `users` table stays the only authentication
   * store. Identity is encoded in a signed, httpOnly cookie.
   */
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 8, // 8 hours
  },

  /**
   * Providers and callbacks are attached in `auth.ts`, where Prisma is
   * available. Keeping them out of this module is what makes it safe to import
   * from `proxy.ts`.
   */

  providers: [],

  trustHost: true,
} satisfies NextAuthConfig;
