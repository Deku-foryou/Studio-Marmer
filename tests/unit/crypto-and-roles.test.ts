import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '@/lib/db/password';
import { isAdminRole, ADMIN_ROLES } from '@/auth.config';

/**
 * Password hashing and the admin role guard.
 *
 * Both are deliberately pure: `lib/db/password.ts` uses only `node:crypto`, and
 * `auth.config.ts` is written to stay free of Prisma and Node-only modules so
 * `proxy.ts` can import it (see that file's own comment). That makes both
 * unit-testable here with no database, no env vars and no server.
 *
 * NOTE ON COST: scrypt runs at N=16384, r=8, p=1. Each hash/verify is genuinely
 * expensive by design - that is what makes the KDF worth using - so this suite
 * is slower than a typical unit suite. It stays fast enough to run on every
 * commit, and the test count is deliberately small.
 *
 * No real credential appears here: passwords below are obvious throwaways, and
 * no hash is copied from `.env` or the database.
 */

const THROWAWAY = 'not-a-real-password';

describe('hashPassword', () => {
  it('produces a verifiable hash for a password', async () => {
    const stored = await hashPassword(THROWAWAY);
    expect(typeof stored).toBe('string');
    expect(await verifyPassword(THROWAWAY, stored)).toBe(true);
  });

  it('never stores the plaintext', async () => {
    const stored = await hashPassword(THROWAWAY);
    expect(stored).not.toContain(THROWAWAY);
  });

  it('emits the documented six-part scrypt format', async () => {
    const stored = await hashPassword(THROWAWAY);
    const parts = stored.split('$');
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe('scrypt');
    // Parameters, then base64 salt and base64 derived key.
    expect(Number.isInteger(Number(parts[1]))).toBe(true);
    expect(Number.isInteger(Number(parts[2]))).toBe(true);
    expect(Number.isInteger(Number(parts[3]))).toBe(true);
    expect(Buffer.from(parts[4], 'base64')).toHaveLength(16);
    expect(Buffer.from(parts[5], 'base64')).toHaveLength(64);
  });

  it('salts each hash, so the same password hashes differently every time', async () => {
    const [a, b] = await Promise.all([hashPassword(THROWAWAY), hashPassword(THROWAWAY)]);
    expect(a).not.toBe(b);
    // Both remain verifiable — the difference is the salt, not the outcome.
    expect(await verifyPassword(THROWAWAY, a)).toBe(true);
    expect(await verifyPassword(THROWAWAY, b)).toBe(true);
  });

  it('refuses to hash an empty password', async () => {
    await expect(hashPassword('')).rejects.toThrow();
  });
});

describe('verifyPassword', () => {
  it('accepts the correct password', async () => {
    const stored = await hashPassword(THROWAWAY);
    expect(await verifyPassword(THROWAWAY, stored)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const stored = await hashPassword(THROWAWAY);
    expect(await verifyPassword('wrong-password', stored)).toBe(false);
  });

  it('rejects a password differing only by case', async () => {
    const stored = await hashPassword(THROWAWAY);
    expect(await verifyPassword(THROWAWAY.toUpperCase(), stored)).toBe(false);
  });

  it('rejects an empty password against a real hash', async () => {
    const stored = await hashPassword(THROWAWAY);
    expect(await verifyPassword('', stored)).toBe(false);
  });

  it('rejects a malformed stored value instead of throwing', async () => {
    // These all reach verifyPassword from the database, so a corrupt row must
    // fail closed rather than crash the login action.
    for (const stored of [
      '',
      'not-a-hash',
      'scrypt$16384$8$1',
      'scrypt$16384$8$1$only-five-parts',
      'bcrypt$16384$8$1$c2FsdA==$aGFzaA==',
      'scrypt$16384$8$1$c2FsdA==',
      // Seven parts.
      'scrypt$16384$8$1$c2FsdA==$aGFzaA==$extra',
    ]) {
      expect(await verifyPassword(THROWAWAY, stored), stored).toBe(false);
    }
  });

  it('rejects non-numeric scrypt parameters', async () => {
    const stored = await hashPassword(THROWAWAY);
    const parts = stored.split('$');
    const tampered = ['scrypt', 'abc', parts[2], parts[3], parts[4], parts[5]].join('$');
    expect(await verifyPassword(THROWAWAY, tampered)).toBe(false);
  });

  it('rejects a hash truncated to a different length', async () => {
    // The constant-time comparison is guarded by a length check; a shorter
    // stored key must return false rather than throw.
    const stored = await hashPassword(THROWAWAY);
    const parts = stored.split('$');
    const shortened = [parts[0], parts[1], parts[2], parts[3], parts[4], Buffer.alloc(16).toString('base64')].join('$');
    expect(await verifyPassword(THROWAWAY, shortened)).toBe(false);
  });

  it('does not authenticate a hash produced with different parameters', async () => {
    const stored = await hashPassword(THROWAWAY);
    const parts = stored.split('$');
    // Claim a different cost while keeping the real salt/key.
    const tampered = ['scrypt', '8192', parts[2], parts[3], parts[4], parts[5]].join('$');
    expect(await verifyPassword(THROWAWAY, tampered)).toBe(false);
  });
});

describe('isAdminRole', () => {
  it('accepts every declared admin role', () => {
    for (const role of ADMIN_ROLES) {
      expect(isAdminRole(role), role).toBe(true);
    }
  });

  it('declares exactly ADMIN and EDITOR', () => {
    expect([...ADMIN_ROLES]).toEqual(['ADMIN', 'EDITOR']);
  });

  it('rejects a non-admin role', () => {
    expect(isAdminRole('CUSTOMER')).toBe(false);
    expect(isAdminRole('ADMINISTRATOR')).toBe(false);
    expect(isAdminRole('admin')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(isAdminRole('admin')).toBe(false);
    expect(isAdminRole('Editor')).toBe(false);
  });

  it('rejects non-string values without throwing', () => {
    // The value arrives from a decoded session token, so it is untrusted.
    for (const value of [undefined, null, 0, 1, true, false, {}, [], NaN]) {
      expect(isAdminRole(value), String(value)).toBe(false);
    }
  });

  it('rejects an empty string', () => {
    expect(isAdminRole('')).toBe(false);
  });
});
