import type { DefaultSession } from 'next-auth';
import type { AdminRole } from '@/auth.config';

/**
 * Module augmentation for Auth.js session/JWT types.
 *
 * Adds the admin identity fields to `session.user` and the JWT so the rest of
 * the codebase gets `session.user.id` and `session.user.role` with full type
 * safety and no `any`.
 */

declare module 'next-auth' {
  interface Session {
    user: {
      /** Stringified `users.id`. */
      id: string;
      /** Role taken from the `users.role` enum. */
      role: AdminRole;
    } & DefaultSession['user'];
  }

  interface User {
    role: AdminRole;
  }
}

/**
 * `next-auth/jwt` only re-exports `@auth/core/jwt`, so the interface must be
 * augmented at its real declaration site for the merge to take effect.
 */
declare module '@auth/core/jwt' {
  interface JWT {
    id?: string;
    role?: AdminRole;
  }
}

export {};
