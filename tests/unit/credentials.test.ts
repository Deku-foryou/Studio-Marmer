import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  authorizeAdminCredentials,
  normalizeEmail,
  normalizePassword,
  DUMMY_PASSWORD_HASH,
  type AdminUserRecord,
} from '@/lib/auth/credentials';

/**
 * Admin credential verification.
 *
 * These exercise the REAL logic from `lib/auth/credentials.ts` — the same code
 * the `authorize` callback in `auth.ts` calls. Only the two ambient boundaries
 * are substituted:
 *
 *   - `findUser` stands in for the Prisma lookup, so no database is needed, and
 *   - `verify` stands in for `verifyPassword`, so the suite does not pay scrypt
 *     cost per case and can assert on *which* hash was checked.
 *
 * Password hashing itself is covered against the real crypto in
 * `crypto-and-roles.test.ts`; duplicating it here would add no coverage. What
 * matters in this file is the DECISION the callback makes.
 *
 * No real credential appears here: every password is an obvious throwaway, and
 * no hash is copied from `.env` or the database.
 */

const VALID_PASSWORD = 'correct-horse-battery-staple';
const WRONG_PASSWORD = 'definitely-not-the-password';

/** The placeholder stored hash used by the `admin()` fixture. */
const STORED_HASH = 'scrypt$16384$8$1$c2FsdA==$aGFzaA==';

/** A stored admin, as the user lookup would return it. */
function admin(over: Partial<AdminUserRecord> = {}): AdminUserRecord {
  return {
    id: 7,
    name: 'Local Dev Admin',
    email: 'admin@marble.test',
    passwordHash: STORED_HASH,
    role: 'ADMIN',
    ...over,
  };
}

/** findUser that returns `user` (or null) for any email. */
function findUserReturning(user: AdminUserRecord | null) {
  return vi.fn(async () => user);
}

/**
 * Verifier that accepts only the expected password AND the expected stored hash,
 * mirroring the real contract: both arguments matter, so a test that passes the
 * wrong fixture hash is rejected rather than silently passing.
 */
function verifyAccepting(password = VALID_PASSWORD, hash = STORED_HASH) {
  return vi.fn(async (candidate: string, stored: string) => {
    return candidate === password && stored === hash;
  });
}

const loginRequest = (ip = '1.1.1.1') =>
  new Request('http://localhost:3000/api/auth/callback/credentials', {
    headers: { 'x-forwarded-for': ip },
  });

beforeEach(() => {
  delete process.env.RATE_LIMIT_MAX_ATTEMPTS;
  delete process.env.RATE_LIMIT_WINDOW_MS;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('input normalisation', () => {
  it('trims and lowercases the email', () => {
    expect(normalizeEmail({ email: '  Admin@Marble.Test  ' })).toBe('admin@marble.test');
  });

  it('reduces a missing or non-string email to an empty string', () => {
    expect(normalizeEmail(undefined)).toBe('');
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail({})).toBe('');
    expect(normalizeEmail({ email: 42 })).toBe('');
    expect(normalizeEmail({ email: null })).toBe('');
  });

  it('passes the password through unchanged, whitespace included', () => {
    // Passwords are never trimmed: leading/trailing spaces are significant.
    expect(normalizePassword({ password: '  spaced  ' })).toBe('  spaced  ');
    expect(normalizePassword({})).toBe('');
    expect(normalizePassword({ password: 123 })).toBe('');
  });
});

describe('successful sign-in', () => {
  it('accepts a valid password and returns the admin for the session', async () => {
    const verify = verifyAccepting();
    const result = await authorizeAdminCredentials(
      { email: 'admin@marble.test', password: VALID_PASSWORD },
      { findUser: findUserReturning(admin()), verify }
    );

    expect(result).toEqual({
      id: '7',
      name: 'Local Dev Admin',
      email: 'admin@marble.test',
      role: 'ADMIN',
    });
  });

  it('accepts an EDITOR as well as an ADMIN', async () => {
    const verify = verifyAccepting();
    for (const role of ['ADMIN', 'EDITOR']) {
      const result = await authorizeAdminCredentials(
        { email: 'admin@marble.test', password: VALID_PASSWORD },
        { findUser: findUserReturning(admin({ role })), verify }
      );
      expect(result, role).not.toBeNull();
      expect(result?.role, role).toBe(role);
    }
  });

  it('matches the email case-insensitively against the lookup', async () => {
    const findUser = findUserReturning(admin());
    const result = await authorizeAdminCredentials(
      { email: '  ADMIN@Marble.Test  ', password: VALID_PASSWORD },
      { findUser, verify: verifyAccepting() }
    );

    expect(result).not.toBeNull();
    // The lookup receives the normalised form, which is what the DB stores.
    expect(findUser).toHaveBeenCalledWith('admin@marble.test');
  });

  it('stringifies a numeric user id for the session', async () => {
    const result = await authorizeAdminCredentials(
      { email: 'admin@marble.test', password: VALID_PASSWORD },
      { findUser: findUserReturning(admin({ id: 42 })), verify: verifyAccepting() }
    );
    expect(result?.id).toBe('42');
    expect(typeof result?.id).toBe('string');
  });

  it('tolerates a null display name', async () => {
    const result = await authorizeAdminCredentials(
      { email: 'admin@marble.test', password: VALID_PASSWORD },
      { findUser: findUserReturning(admin({ name: null })), verify: verifyAccepting() }
    );
    expect(result?.name).toBeNull();
  });

  it('uses the real verifyPassword by default', async () => {
    // Guards against the injected verifier becoming the only tested path.
    const { hashPassword } = await import('@/lib/db/password');
    const passwordHash = await hashPassword(VALID_PASSWORD);

    const result = await authorizeAdminCredentials(
      { email: 'admin@marble.test', password: VALID_PASSWORD },
      { findUser: findUserReturning(admin({ passwordHash })) }
    );
    expect(result).not.toBeNull();

    const rejected = await authorizeAdminCredentials(
      { email: 'admin@marble.test', password: WRONG_PASSWORD },
      { findUser: findUserReturning(admin({ passwordHash })) }
    );
    expect(rejected).toBeNull();
  });
});

describe('rejected sign-in', () => {
  it('rejects a wrong password', async () => {
    const result = await authorizeAdminCredentials(
      { email: 'admin@marble.test', password: WRONG_PASSWORD },
      { findUser: findUserReturning(admin()), verify: verifyAccepting() }
    );
    expect(result).toBeNull();
  });

  it('rejects an unknown email with the same undifferentiated result', async () => {
    const result = await authorizeAdminCredentials(
      { email: 'nobody@marble.test', password: VALID_PASSWORD },
      { findUser: findUserReturning(null), verify: verifyAccepting() }
    );
    // The caller cannot distinguish "no such user" from "wrong password".
    expect(result).toBeNull();
  });

  it('runs a verification against the dummy hash for an unknown email', async () => {
    // Without this, an unknown email returns far faster than a wrong password
    // and the admin account list can be enumerated by timing.
    const verify = verifyAccepting();
    await authorizeAdminCredentials(
      { email: 'nobody@marble.test', password: VALID_PASSWORD },
      { findUser: findUserReturning(null), verify }
    );

    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledWith(VALID_PASSWORD, DUMMY_PASSWORD_HASH);
  });

  it('rejects a missing email or password without touching the database', async () => {
    for (const credentials of [
      {},
      { email: 'admin@marble.test' },
      { password: VALID_PASSWORD },
      { email: '', password: VALID_PASSWORD },
      { email: '   ', password: VALID_PASSWORD },
      { email: 'admin@marble.test', password: '' },
      undefined,
      null,
    ]) {
      const findUser = findUserReturning(admin());
      const result = await authorizeAdminCredentials(credentials, {
        findUser,
        verify: verifyAccepting(),
      });
      expect(result, JSON.stringify(credentials)).toBeNull();
      // A missing field must not even reach the user lookup.
      expect(findUser, JSON.stringify(credentials)).not.toHaveBeenCalled();
    }
  });

  it('rejects a non-admin role even with the correct password', async () => {
    for (const role of ['CUSTOMER', 'USER', 'admin', 'ADMINISTRATOR', '']) {
      const result = await authorizeAdminCredentials(
        { email: 'admin@marble.test', password: VALID_PASSWORD },
        { findUser: findUserReturning(admin({ role })), verify: verifyAccepting() }
      );
      expect(result, role).toBeNull();
    }
  });

  it('fails safely when a stored hash is malformed', async () => {
    // A corrupt row must deny access, never crash the action and never grant it.
    const realVerify = await import('@/lib/db/password').then((m) => m.verifyPassword);
    for (const passwordHash of [
      '',
      'garbage',
      'bcrypt$16384$8$1$c2FsdA==$aGFzaA==',
      'scrypt$notanumber$8$1$c2FsdA==$aGFzaA==',
      'scrypt$16384$8$1$only-four',
    ]) {
      const result = await authorizeAdminCredentials(
        { email: 'admin@marble.test', password: VALID_PASSWORD },
        { findUser: findUserReturning(admin({ passwordHash })), verify: realVerify }
      );
      expect(result, passwordHash).toBeNull();
    }
  });

  it('rejects when the stored hash is a valid hash of a different password', async () => {
    const { hashPassword } = await import('@/lib/db/password');
    const otherPasswordHash = await hashPassword('a-completely-different-password');
    const result = await authorizeAdminCredentials(
      { email: 'admin@marble.test', password: VALID_PASSWORD },
      { findUser: findUserReturning(admin({ passwordHash: otherPasswordHash })) }
    );
    expect(result).toBeNull();
  });

  it('propagates a database failure instead of treating it as success', async () => {
    const findUser = vi.fn(async () => {
      throw new Error('connection refused to db.internal:3306');
    });

    await expect(
      authorizeAdminCredentials(
        { email: 'admin@marble.test', password: VALID_PASSWORD },
        { findUser, verify: verifyAccepting() }
      )
    ).rejects.toThrow();

    // The critical property: it rejected rather than resolving to a user.
    expect(findUser).toHaveBeenCalledTimes(1);
  });
});

describe('no information leaks through the return value', () => {
  it('returns only null or a minimal session object', async () => {
    const cases = [
      { email: 'admin@marble.test', password: WRONG_PASSWORD, user: admin() },
      { email: 'nobody@marble.test', password: VALID_PASSWORD, user: null },
      { email: 'admin@marble.test', password: VALID_PASSWORD, user: admin({ role: 'CUSTOMER' }) },
    ];

    for (const c of cases) {
      const result = await authorizeAdminCredentials(
        { email: c.email, password: c.password },
        { findUser: findUserReturning(c.user), verify: verifyAccepting() }
      );
      if (result === null) {
        expect(result).toBeNull();
      } else {
        // Exactly the four session fields — never passwordHash, never a role
        // the caller is not entitled to.
        expect(Object.keys(result).sort()).toEqual(['email', 'id', 'name', 'role']);
      }
    }
  });

  it('never returns the password hash', async () => {
    const { hashPassword } = await import('@/lib/db/password');
    const passwordHash = await hashPassword(VALID_PASSWORD);
    const result = await authorizeAdminCredentials(
      { email: 'admin@marble.test', password: VALID_PASSWORD },
      { findUser: findUserReturning(admin({ passwordHash })) }
    );
    expect(JSON.stringify(result)).not.toContain(passwordHash);
    expect(JSON.stringify(result)).not.toContain('scrypt$');
  });

  it('gives identical output for every failure mode', async () => {
    const outcomes = await Promise.all([
      authorizeAdminCredentials(
        { email: 'admin@marble.test', password: WRONG_PASSWORD },
        { findUser: findUserReturning(admin()), verify: verifyAccepting() }
      ),
      authorizeAdminCredentials(
        { email: 'ghost@marble.test', password: VALID_PASSWORD },
        { findUser: findUserReturning(null), verify: verifyAccepting() }
      ),
      authorizeAdminCredentials(
        { email: 'admin@marble.test', password: VALID_PASSWORD },
        { findUser: findUserReturning(admin({ role: 'CUSTOMER' })), verify: verifyAccepting() }
      ),
    ]);

    // No Error, no reason code, no difference at all between them.
    expect(outcomes).toEqual([null, null, null]);
  });
});

describe('interaction with the rate limiter', () => {
  it('records a failure for a wrong password', async () => {
    vi.resetModules();
    const limiter = await import('@/lib/auth/rate-limiter');
    const credentials = await import('@/lib/auth/credentials');
    const request = loginRequest('2.2.2.2');

    await credentials.authorizeAdminCredentials(
      { email: 'admin@marble.test', password: WRONG_PASSWORD },
      { request, findUser: findUserReturning(admin()), verify: verifyAccepting() }
    );

    expect(limiter.checkRateLimit(request, 'admin@marble.test').remaining).toBe(9);
  });

  it('records a failure for an unknown email', async () => {
    vi.resetModules();
    const limiter = await import('@/lib/auth/rate-limiter');
    const credentials = await import('@/lib/auth/credentials');
    const request = loginRequest('2.2.2.3');

    await credentials.authorizeAdminCredentials(
      { email: 'ghost@marble.test', password: VALID_PASSWORD },
      { request, findUser: findUserReturning(null), verify: verifyAccepting() }
    );

    expect(limiter.checkRateLimit(request, 'ghost@marble.test').remaining).toBe(9);
  });

  it('records a failure for a non-admin role', async () => {
    vi.resetModules();
    const limiter = await import('@/lib/auth/rate-limiter');
    const credentials = await import('@/lib/auth/credentials');
    const request = loginRequest('2.2.2.4');

    await credentials.authorizeAdminCredentials(
      { email: 'admin@marble.test', password: VALID_PASSWORD },
      { request, findUser: findUserReturning(admin({ role: 'CUSTOMER' })), verify: verifyAccepting() }
    );

    expect(limiter.checkRateLimit(request, 'admin@marble.test').remaining).toBe(9);
  });

  it('clears the counter after a successful sign-in', async () => {
    vi.resetModules();
    const limiter = await import('@/lib/auth/rate-limiter');
    const credentials = await import('@/lib/auth/credentials');
    const request = loginRequest('2.2.2.5');

    await credentials.authorizeAdminCredentials(
      { email: 'admin@marble.test', password: WRONG_PASSWORD },
      { request, findUser: findUserReturning(admin()), verify: verifyAccepting() }
    );
    expect(limiter.checkRateLimit(request, 'admin@marble.test').remaining).toBe(9);

    await credentials.authorizeAdminCredentials(
      { email: 'admin@marble.test', password: VALID_PASSWORD },
      { request, findUser: findUserReturning(admin()), verify: verifyAccepting() }
    );

    expect(limiter.checkRateLimit(request, 'admin@marble.test').remaining).toBe(10);
  });

  it('refuses once rate limited, without extending the lockout', async () => {
    vi.resetModules();
    process.env.RATE_LIMIT_MAX_ATTEMPTS = '3';
    const limiter = await import('@/lib/auth/rate-limiter');
    const credentials = await import('@/lib/auth/credentials');
    const request = loginRequest('2.2.2.6');

    // Burn through the allowance with wrong passwords.
    for (let i = 0; i < 3; i++) {
      await credentials.authorizeAdminCredentials(
        { email: 'admin@marble.test', password: WRONG_PASSWORD },
        { request, findUser: findUserReturning(admin()), verify: verifyAccepting() }
      );
    }
    expect(limiter.checkRateLimit(request, 'admin@marble.test').allowed).toBe(false);

    // A correct password is still refused while locked out...
    const findUser = findUserReturning(admin());
    const refused = await credentials.authorizeAdminCredentials(
      { email: 'admin@marble.test', password: VALID_PASSWORD },
      { request, findUser, verify: verifyAccepting() }
    );
    expect(refused).toBeNull();
    expect(findUser).not.toHaveBeenCalled();

    // ...and the refused attempt did NOT extend the window.
    const before = limiter.checkRateLimit(request, 'admin@marble.test').retryAfter;
    await credentials.authorizeAdminCredentials(
      { email: 'admin@marble.test', password: VALID_PASSWORD },
      { request, findUser: findUserReturning(admin()), verify: verifyAccepting() }
    );
    const after = limiter.checkRateLimit(request, 'admin@marble.test').retryAfter;
    expect(after).toBe(before);

    delete process.env.RATE_LIMIT_MAX_ATTEMPTS;
  });

  it('does not require a request object', async () => {
    // Auth.js may omit it; the flow must still work, just without limiting.
    const result = await authorizeAdminCredentials(
      { email: 'admin@marble.test', password: VALID_PASSWORD },
      { findUser: findUserReturning(admin()), verify: verifyAccepting() }
    );
    expect(result).not.toBeNull();
  });
});
