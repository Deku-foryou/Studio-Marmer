import { isAdminRole, type AdminRole } from '@/auth.config';
import { verifyPassword } from '@/lib/db/password';
import {
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts,
} from '@/lib/auth/rate-limiter';

/**
 * Credential verification for the admin sign-in, extracted from the
 * `authorize` callback in `auth.ts`.
 *
 * WHY THIS IS A SEPARATE MODULE
 * The callback lived inside `NextAuth({ providers: [...] })`, which is only
 * reachable once the Auth.js runtime has booted. Importing `auth.ts` from a unit
 * test fails outright — `next-auth/lib/env.js` requires `next/server`, which
 * only resolves inside a Next.js server context. That left the single most
 * security-critical function in the project with no automated coverage at all.
 *
 * This module holds the same logic verbatim, with the two ambient dependencies
 * injected:
 *
 *   - `findUser` replaces the direct Prisma call, so the lookup can be
 *     exercised without a database, and
 *   - `verify` replaces `verifyPassword` so a test does not have to pay scrypt
 *     cost on every case.
 *
 * `auth.ts` passes the real implementations, so production behaviour is
 * unchanged. This is an extraction, not a rewrite: no branch, ordering, message
 * or side effect was altered.
 */

/**
 * A hash of a password nobody knows, used to equalise timing between
 * "no such user" and "wrong password".
 *
 * Without it, a failed lookup returns noticeably faster than a failed
 * verification, which lets an attacker enumerate valid admin emails. The cost is
 * one extra scrypt run per unknown-email attempt.
 *
 * Identical to the constant in `auth.ts`.
 */
export const DUMMY_PASSWORD_HASH =
  'scrypt$16384$8$1$1sa1swtUP5SKjELWJ2zPZQ==$UqgG+6qfbC2p51tFPQEklmHqSvdbVeUesHmeUDRmozSBSZIjzteJ4lctRpm8FGtqkKjdxrXo0bK6E5+StHYPzQ==';

/** The subset of the `users` row this flow needs. */
export type AdminUserRecord = {
  id: number | string;
  name: string | null;
  email: string;
  passwordHash: string;
  role: string;
};

/** The shape Auth.js persists into the session when sign-in succeeds. */
export type AuthorizedAdmin = {
  id: string;
  name: string | null;
  email: string;
  role: AdminRole;
};

/** What Auth.js hands the callback; both fields are attacker-controlled. */
export type RawCredentials = Record<string, unknown> | undefined | null;

export type FindUser = (email: string) => Promise<AdminUserRecord | null>;

export type VerifyPasswordFn = (
  password: string,
  stored: string
) => Promise<boolean>;

/**
 * Normalises the submitted email exactly as Auth.js expects it.
 *
 * Trimmed and lowercased so that `Admin@Studio-Marmer.test` and
 * `admin@studio-marmer.test ` resolve to the same account — and, importantly, to
 * the same rate-limit key, since the limiter is keyed on this value.
 */
export function normalizeEmail(credentials: RawCredentials): string {
  const email = credentials?.email;
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

/** The submitted password, or an empty string when absent. */
export function normalizePassword(credentials: RawCredentials): string {
  const password = credentials?.password;
  return typeof password === 'string' ? password : '';
}

/**
 * Verifies admin credentials.
 *
 * Returns the admin to place in the session, or `null` for every failure. The
 * `null` return is deliberately undifferentiated: the caller cannot tell — and
 * must not be able to tell — whether the email was unknown, the password wrong,
 * the account lacks an admin role, or the caller is rate limited.
 */
export async function authorizeAdminCredentials(
  credentials: RawCredentials,
  options: {
    /** Present when Auth.js supplies the originating request. */
    request?: Request;
    findUser: FindUser;
    verify?: VerifyPasswordFn;
  }
): Promise<AuthorizedAdmin | null> {
  const { request: req, findUser, verify = verifyPassword } = options;

  const email = normalizeEmail(credentials);
  const password = normalizePassword(credentials);

  if (!email || !password) {
    return null;
  }

  // Rate limited: refuse WITHOUT recording a failure, so a locked-out caller
  // cannot extend its own lockout by hammering.
  if (req) {
    const rateLimit = checkRateLimit(req, email);

    if (!rateLimit.allowed) {
      return null;
    }
  }

  const user = await findUser(email);

  if (!user) {
    // Burn equivalent time so an unknown email is not distinguishable by speed.
    await verify(password, DUMMY_PASSWORD_HASH);
    if (req) recordFailedAttempt(req, email);
    return null;
  }

  const passwordIsValid = await verify(password, user.passwordHash);

  if (!passwordIsValid) {
    if (req) recordFailedAttempt(req, email);
    return null;
  }

  if (!isAdminRole(user.role)) {
    // Correct password but not an admin: still a failure, and still counted.
    if (req) recordFailedAttempt(req, email);
    return null;
  }

  if (req) resetAttempts(req, email);

  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role as AdminRole,
  };
}
