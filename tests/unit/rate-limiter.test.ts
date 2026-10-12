import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import type {
  checkRateLimit as CheckRateLimit,
  recordFailedAttempt as RecordFailedAttempt,
  resetAttempts as ResetAttempts,
} from '@/lib/auth/rate-limiter';

/**
 * Rate limiter behaviour.
 *
 * These tests drive the REAL module — no mocks, no reimplementation. The only
 * thing faked is time (via fake timers) and the process environment, because
 * both are read at module load.
 *
 * ## Module state and isolation
 *
 * `lib/auth/rate-limiter.ts` keeps its counters in a module-level `Map` and
 * reads `RATE_LIMIT_MAX_ATTEMPTS` / `RATE_LIMIT_WINDOW_MS` once at import.
 * Neither is resettable from outside, so each test loads a fresh copy:
 *
 *     vi.resetModules();
 *     process.env.RATE_LIMIT_MAX_ATTEMPTS = '3';
 *     const limiter = await import('@/lib/auth/rate-limiter');
 *
 * That yields an empty `Map` and re-reads the env, so no counter and no timer
 * leaks between tests. No production export was added purely for testing —
 * `resetAttempts()` already exists for the real "successful login" path and is
 * exercised here for its actual purpose, not as a test hook.
 */

type Limiter = {
  checkRateLimit: typeof CheckRateLimit;
  recordFailedAttempt: typeof RecordFailedAttempt;
  resetAttempts: typeof ResetAttempts;
};

/** Loads a pristine limiter with the given policy. */
async function loadLimiter(
  env: { maxAttempts?: string; windowMs?: string } = {}
): Promise<Limiter> {
  vi.resetModules();
  if (env.maxAttempts !== undefined) process.env.RATE_LIMIT_MAX_ATTEMPTS = env.maxAttempts;
  else delete process.env.RATE_LIMIT_MAX_ATTEMPTS;
  if (env.windowMs !== undefined) process.env.RATE_LIMIT_WINDOW_MS = env.windowMs;
  else delete process.env.RATE_LIMIT_WINDOW_MS;
  return await import('@/lib/auth/rate-limiter');
}

/** A request as the login callback would supply it, with a proxy IP header. */
function requestFrom(ip: string, extra: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/auth/callback/credentials', {
    headers: { 'x-forwarded-for': ip, ...extra },
  });
}

/** A request with no identity headers at all. */
function anonymousRequest(url = 'http://localhost:3000/api/auth/callback/credentials'): Request {
  return new Request(url);
}

beforeEach(() => {
  delete process.env.RATE_LIMIT_MAX_ATTEMPTS;
  delete process.env.RATE_LIMIT_WINDOW_MS;
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.RATE_LIMIT_MAX_ATTEMPTS;
  delete process.env.RATE_LIMIT_WINDOW_MS;
});

describe('threshold', () => {
  it('allows an identity that has never failed', async () => {
    const { checkRateLimit } = await loadLimiter({ maxAttempts: '5' });
    const result = checkRateLimit(requestFrom('1.1.1.1'), 'admin@studio-marmer.test');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it('decrements remaining once per recorded failure', async () => {
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({ maxAttempts: '5' });
    const request = requestFrom('1.1.1.1');

    for (let failures = 1; failures <= 4; failures++) {
      recordFailedAttempt(request, 'admin@studio-marmer.test');
      const result = checkRateLimit(request, 'admin@studio-marmer.test');
      expect(result.allowed, `${failures} failures`).toBe(true);
      expect(result.remaining).toBe(5 - failures);
    }
  });

  it('refuses once the threshold is reached', async () => {
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({ maxAttempts: '3' });
    const request = requestFrom('1.1.1.1');

    recordFailedAttempt(request, 'admin@studio-marmer.test');
    recordFailedAttempt(request, 'admin@studio-marmer.test');
    expect(checkRateLimit(request, 'admin@studio-marmer.test').allowed).toBe(true);

    recordFailedAttempt(request, 'admin@studio-marmer.test');
    const blocked = checkRateLimit(request, 'admin@studio-marmer.test');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('permits exactly MAX_ATTEMPTS failed attempts and refuses the next', async () => {
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({ maxAttempts: '4' });
    const request = requestFrom('1.1.1.1');
    const verdicts: boolean[] = [];

    // Record one failure, then ask whether the next attempt is permitted,
    // MAX_ATTEMPTS + 1 times in total.
    for (let i = 0; i < 5; i++) {
      verdicts.push(checkRateLimit(request, 'admin@studio-marmer.test').allowed);
      recordFailedAttempt(request, 'admin@studio-marmer.test');
    }

    expect(verdicts).toEqual([true, true, true, true, false]);
  });

  it('stays refused however many further attempts are made', async () => {
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({ maxAttempts: '2' });
    const request = requestFrom('1.1.1.1');
    recordFailedAttempt(request, 'a@u.test');
    recordFailedAttempt(request, 'a@u.test');

    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(request, 'a@u.test');
      expect(checkRateLimit(request, 'a@u.test').allowed).toBe(false);
    }
  });

  it('reports retryAfter in seconds once blocked', async () => {
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({
      maxAttempts: '1',
      windowMs: '600000', // 10 minutes
    });
    const request = requestFrom('1.1.1.1');
    recordFailedAttempt(request, 'a@u.test');
    recordFailedAttempt(request, 'a@u.test');

    const result = checkRateLimit(request, 'a@u.test');
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(600);
  });

  it('defaults to 10 attempts and a 15 minute window when env is unset', async () => {
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter();
    const request = requestFrom('1.1.1.1');

    expect(checkRateLimit(request, 'a@u.test').remaining).toBe(10);

    for (let i = 0; i < 9; i++) recordFailedAttempt(request, 'a@u.test');
    expect(checkRateLimit(request, 'a@u.test').allowed).toBe(true);

    recordFailedAttempt(request, 'a@u.test');
    const blocked = checkRateLimit(request, 'a@u.test');
    expect(blocked.allowed).toBe(false);
    // 15 minutes expressed in seconds.
    expect(blocked.retryAfter).toBe(900);
  });
});

describe('counter isolation', () => {
  it('keeps a separate counter per client IP for the same email', async () => {
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({ maxAttempts: '2' });
    const attacker = requestFrom('2.2.2.2');
    const other = requestFrom('3.3.3.3');

    recordFailedAttempt(attacker, 'admin@studio-marmer.test');
    recordFailedAttempt(attacker, 'admin@studio-marmer.test');

    expect(checkRateLimit(attacker, 'admin@studio-marmer.test').allowed).toBe(false);
    // A different client targeting the same account is unaffected.
    expect(checkRateLimit(other, 'admin@studio-marmer.test').allowed).toBe(true);
  });

  it('keeps a separate counter per email for the same client IP', async () => {
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({ maxAttempts: '2' });
    const request = requestFrom('2.2.2.2');

    recordFailedAttempt(request, 'target@studio-marmer.test');
    recordFailedAttempt(request, 'target@studio-marmer.test');

    expect(checkRateLimit(request, 'target@studio-marmer.test').allowed).toBe(false);
    expect(checkRateLimit(request, 'someone-else@studio-marmer.test').allowed).toBe(true);
  });

  it('treats the email case-insensitively', async () => {
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({ maxAttempts: '2' });
    const request = requestFrom('2.2.2.2');

    recordFailedAttempt(request, 'Admin@Studio-Marmer.test');
    recordFailedAttempt(request, 'admin@studio-marmer.test');

    expect(checkRateLimit(request, 'ADMIN@STUDIO-MARMER.TEST').allowed).toBe(false);
  });

  it('takes the first entry from a proxy chain', async () => {
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({ maxAttempts: '1' });
    const chained = requestFrom('9.9.9.9', { 'x-forwarded-for': '9.9.9.9, 8.8.8.8, 7.7.7.7' });

    recordFailedAttempt(chained, 'a@u.test');
    recordFailedAttempt(chained, 'a@u.test');

    // The counter is keyed on 9.9.9.9, so a request claiming only that leading
    // entry is blocked, while one claiming a later hop is a different identity.
    expect(checkRateLimit(requestFrom('9.9.9.9'), 'a@u.test').allowed).toBe(false);
    expect(checkRateLimit(requestFrom('8.8.8.8'), 'a@u.test').allowed).toBe(true);
  });
});

describe('reset and expiry', () => {
  it('resetAttempts clears the counter', async () => {
    const { checkRateLimit, recordFailedAttempt, resetAttempts } = await loadLimiter({
      maxAttempts: '2',
    });
    const request = requestFrom('4.4.4.4');
    recordFailedAttempt(request, 'a@u.test');
    recordFailedAttempt(request, 'a@u.test');
    expect(checkRateLimit(request, 'a@u.test').allowed).toBe(false);

    resetAttempts(request, 'a@u.test');

    const afterReset = checkRateLimit(request, 'a@u.test');
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(2);
  });

  it('resetAttempts for one identity leaves others blocked', async () => {
    const { checkRateLimit, recordFailedAttempt, resetAttempts } = await loadLimiter({
      maxAttempts: '1',
    });
    const request = requestFrom('4.4.4.4');
    recordFailedAttempt(request, 'a@u.test');
    recordFailedAttempt(request, 'a@u.test');
    recordFailedAttempt(request, 'b@u.test');
    recordFailedAttempt(request, 'b@u.test');

    resetAttempts(request, 'a@u.test');

    expect(checkRateLimit(request, 'a@u.test').allowed).toBe(true);
    expect(checkRateLimit(request, 'b@u.test').allowed).toBe(false);
  });

  it('allows again once the window has elapsed', async () => {
    vi.useFakeTimers();
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({
      maxAttempts: '2',
      windowMs: '900000', // 15 minutes
    });
    const request = requestFrom('5.5.5.5');

    recordFailedAttempt(request, 'a@u.test');
    recordFailedAttempt(request, 'a@u.test');
    expect(checkRateLimit(request, 'a@u.test').allowed).toBe(false);

    vi.advanceTimersByTime(900_001);

    const afterWindow = checkRateLimit(request, 'a@u.test');
    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.remaining).toBe(2);
  });

  it('does not expire a second early', async () => {
    vi.useFakeTimers();
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({
      maxAttempts: '2',
      windowMs: '900000',
    });
    const request = requestFrom('5.5.5.5');
    recordFailedAttempt(request, 'a@u.test');
    recordFailedAttempt(request, 'a@u.test');

    vi.advanceTimersByTime(899_999);
    expect(checkRateLimit(request, 'a@u.test').allowed).toBe(false);
  });

  it('expires a blocked record without any new failure being recorded', async () => {
    // The expiry check lives in checkRateLimit itself, so an attacker who stops
    // guessing is not locked out forever and no background timer is required.
    vi.useFakeTimers();
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({
      maxAttempts: '2',
      windowMs: '60000',
    });
    const request = requestFrom('6.6.6.6');
    recordFailedAttempt(request, 'a@u.test');
    recordFailedAttempt(request, 'a@u.test');
    expect(checkRateLimit(request, 'a@u.test').allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(checkRateLimit(request, 'a@u.test').allowed).toBe(true);
  });

  it('starts a fresh window when a failure arrives after expiry', async () => {
    vi.useFakeTimers();
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({
      maxAttempts: '2',
      windowMs: '60000',
    });
    const request = requestFrom('6.6.6.6');
    recordFailedAttempt(request, 'a@u.test');
    recordFailedAttempt(request, 'a@u.test');

    vi.advanceTimersByTime(60_001);
    // A late failure must not resurrect the old, expired record.
    recordFailedAttempt(request, 'a@u.test');

    const result = checkRateLimit(request, 'a@u.test');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('the background sweep does not keep the process alive', async () => {
    vi.useFakeTimers();
    await loadLimiter();
    // The module installs one 60s sweep interval. `unref()` means it must not
    // hold the event loop open; a test can only observe that it is a plain timer.
    expect(vi.getTimerCount()).toBe(1);
    vi.useRealTimers();
  });
});

describe('hostile or missing identity input', () => {
  it('handles a request with no proxy headers without throwing', async () => {
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({ maxAttempts: '2' });
    const request = anonymousRequest();

    expect(() => checkRateLimit(request, 'a@u.test')).not.toThrow();
    expect(() => recordFailedAttempt(request, 'a@u.test')).not.toThrow();
    expect(checkRateLimit(request, 'a@u.test').allowed).toBe(true);
  });

  it('groups header-less clients under one shared identity', async () => {
    // Documented limitation, not a recommendation: with no proxy headers every
    // client resolves to "unknown", so they all share a counter and one client
    // can lock out the others for that email. In a real deployment a proxy sets
    // x-forwarded-for, which is what makes the per-IP key meaningful.
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({ maxAttempts: '2' });
    const a = anonymousRequest('http://localhost:3000/a');
    const b = anonymousRequest('http://localhost:3000/b');

    recordFailedAttempt(a, 'a@u.test');
    recordFailedAttempt(a, 'a@u.test');

    expect(checkRateLimit(a, 'a@u.test').allowed).toBe(false);
    expect(checkRateLimit(b, 'a@u.test').allowed).toBe(false);
  });

  it('treats an empty x-forwarded-for as absent', async () => {
    const { checkRateLimit } = await loadLimiter({ maxAttempts: '2' });
    const request = new Request('http://localhost:3000/x', {
      headers: { 'x-forwarded-for': '' },
    });
    expect(() => checkRateLimit(request, 'a@u.test')).not.toThrow();
    expect(checkRateLimit(request, 'a@u.test').allowed).toBe(true);
  });

  it('accepts an unusual but well-formed identity string without throwing', async () => {
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({ maxAttempts: '2' });
    for (const value of ['::1', 'unknown', 'not-an-ip', '1.2.3.4:5678', '0.0.0.0']) {
      const request = requestFrom(value);
      expect(() => recordFailedAttempt(request, 'a@u.test'), value).not.toThrow();
      expect(() => checkRateLimit(request, 'a@u.test'), value).not.toThrow();
    }
  });

  it('handles emails that are not valid addresses without throwing', async () => {
    // The limiter is not a validator; auth.ts rejects malformed credentials
    // before this is reached. It must still key them safely rather than crash.
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({ maxAttempts: '2' });
    const request = requestFrom('7.7.7.7');

    for (const email of ['', '   ', 'no-at-sign', '@', 'a@', 'ünïcode@例え.test']) {
      expect(() => recordFailedAttempt(request, email), JSON.stringify(email)).not.toThrow();
      expect(() => checkRateLimit(request, email), JSON.stringify(email)).not.toThrow();
    }
  });

  it('does not trim whitespace out of the email key', async () => {
    // Documented as-is: the key is the lowercased email verbatim. auth.ts
    // normalises and trims the email BEFORE calling the limiter, so the
    // production path never produces a padded key.
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({ maxAttempts: '1' });
    const request = requestFrom('8.8.8.8');

    recordFailedAttempt(request, ' a@u.test ');
    recordFailedAttempt(request, ' a@u.test ');

    expect(checkRateLimit(request, ' a@u.test ').allowed).toBe(false);
    expect(checkRateLimit(request, 'a@u.test').allowed).toBe(true);
  });
});

describe('misconfigured environment', () => {
  it('fails closed when the attempt limit is not a number', async () => {
    // Number('abc') is NaN, so every comparison against MAX_ATTEMPTS is false
    // and the identity is refused after a single failure. Not exploitable, but
    // worth pinning: a typo in the env var must not silently disable limiting.
    const { checkRateLimit, recordFailedAttempt } = await loadLimiter({
      maxAttempts: 'not-a-number',
    });
    const request = requestFrom('1.1.1.1');

    recordFailedAttempt(request, 'a@u.test');
    expect(checkRateLimit(request, 'a@u.test').allowed).toBe(false);
  });

  it('reads the environment once at import, not on every call', async () => {
    const limiter = await loadLimiter({ maxAttempts: '5' });
    // Mutating the env afterwards must not change the already-loaded policy.
    process.env.RATE_LIMIT_MAX_ATTEMPTS = '99';
    expect(limiter.checkRateLimit(requestFrom('1.1.1.1'), 'a@u.test').remaining).toBe(5);
  });
});
