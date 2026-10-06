import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from 'crypto';

/**
 * Promise wrapper around `crypto.scrypt`.
 *
 * `promisify()` resolves to the 3-argument overload and drops the options
 * parameter from the type signature, so the wrapper is declared explicitly.
 */
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

/**
 * Password hashing built on Node's built-in `crypto.scrypt`.
 *
 * Deliberately dependency-free: the project constraint for this phase is to add
 * only Prisma/MySQL packages, so a native `bcrypt`/`argon2` dependency is not
 * introduced here.
 *
 * scrypt is a memory-hard KDF and is an acceptable choice for a single-admin
 * store. If a second admin tier or customer accounts are added later, consider
 * migrating to argon2id.
 */

const PARAMS = {
  /** CPU/memory cost. 2^14 is the widely used interactive-login setting. */
  N: 16384,
  /** Block size. */
  r: 8,
  /** Parallelisation. */
  p: 1,
} as const;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

const PREFIX = 'scrypt';

export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error('Cannot hash an empty password.');
  }

  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password, salt, KEY_LENGTH, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
  });

  return [
    PREFIX,
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split('$');

  if (parts.length !== 6 || parts[0] !== PREFIX) {
    return false;
  }

  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);

  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');

  const derived = await scryptAsync(password, salt, expected.length, {
    N,
    r,
    p,
  });

  // Constant-time comparison to avoid leaking information via timing.
  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}
