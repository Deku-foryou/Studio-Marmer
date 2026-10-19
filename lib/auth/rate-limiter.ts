import { isIP } from 'node:net';

/**
 * Login rate limiting.
 *
 * TWO PROBLEMS THIS ADDRESSES
 *
 * 1. The client IP was read from the LEFTMOST `X-Forwarded-For` entry, which is
 *    written by the caller. A script that sends a fresh header per request got a
 *    fresh key every time, so the counter never tripped. Proven before the fix:
 *    five failures against a limit of three, each with a different fake address,
 *    still returned `allowed: true`.
 *
 * 2. The counter was keyed on IP *and* email together, so distributing attempts
 *    across addresses left the per-IP counter untouched even without forging a
 *    header. There is now a second, independent counter per account.
 *
 * HOW THE CLIENT ADDRESS IS DERIVED NOW
 *
 *  - `X-Real-IP` is preferred, because a correctly configured reverse proxy
 *    OVERWRITES it with the address it actually saw. A client-supplied value
 *    cannot survive that.
 *  - Otherwise the RIGHTMOST `X-Forwarded-For` entry is used. This is the right
 *    choice for the standard `proxy_set_header X-Forwarded-For
 *    $proxy_add_x_forwarded_for;`, which APPENDS the real peer address to
 *    whatever the client sent. The attacker controls the left of the list; the
 *    proxy controls the right. The previous code read the left end, which is the
 *    one part of that header nobody vouches for.
 *  - Either value must parse as an IP address. A header full of arbitrary text
 *    falls through to `unknown` rather than becoming a key.
 *
 * REQUIRED PROXY CONFIGURATION
 *   nginx:
 *     proxy_set_header X-Real-IP  $remote_addr;
 *     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
 *   Both lines are needed for a correct identity. With `X-Real-IP` present the
 *   first line alone is sufficient; without a proxy in front at all, no header
 *   can be trusted and everything shares the `unknown` bucket — safe from
 *   brute force, but it will lock out unrelated visitors, so do not run this
 *   way in production.
 *
 * WHY THE ACCOUNT COUNTER IS NOT JUST A DUPLICATE
 * The per-address counter stops one host hammering. The per-account counter
 * stops one login being hammered, which is the thing actually being attacked and
 * the only identifier here the caller cannot change. It defaults to three times
 * the per-address cap so that a shared office IP cannot lock a real admin out
 * while still capping a distributed attempt at a finite number.
 */

const MAX_ATTEMPTS = Number(process.env.RATE_LIMIT_MAX_ATTEMPTS ?? 10);
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);

/**
 * Cap for the per-account counter. Independent of the caller's address, so
 * rotating IPs does not reset it.
 */
const ACCOUNT_MAX_ATTEMPTS = Number(
  process.env.RATE_LIMIT_ACCOUNT_MAX_ATTEMPTS ?? MAX_ATTEMPTS * 3
);

/** Bucket shared by requests whose origin cannot be determined at all. */
const UNKNOWN_IP = 'unknown';

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  blocked: boolean;
}

interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

const attempts = new Map<string, AttemptRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts) {
    if (now - record.firstAttempt > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}, 60_000).unref();

/**
 * The address this request came from, or `unknown`.
 *
 * Exported for the unit suite so the header handling can be asserted directly
 * rather than inferred through a counter.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp && isIP(realIp) !== 0) return realIp;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const entries = forwarded
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    const last = entries[entries.length - 1];
    if (last && isIP(last) !== 0) return last;
  }

  return UNKNOWN_IP;
}

/** The two counters consulted for one attempt. */
function buildKeys(
  request: Request,
  email: string
): { ipKey: string; accountKey: string } {
  const normalized = email.toLowerCase();
  return {
    ipKey: `ip:${getClientIp(request)}:${normalized}`,
    accountKey: `account:${normalized}`,
  };
}

/** Applies one counter's window, block state and cap. */
function evaluate(
  record: AttemptRecord | undefined,
  limit: number,
  now: number
): RateLimitDecision {
  if (!record) return { allowed: true, remaining: limit };

  if (now - record.firstAttempt > WINDOW_MS) {
    return { allowed: true, remaining: limit };
  }

  if (record.blocked) {
    const retryAfter = Math.ceil((record.firstAttempt + WINDOW_MS - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  return {
    allowed: record.count < limit,
    remaining: Math.max(0, limit - record.count),
  };
}

/** The stricter of two decisions; a block on either counter blocks. */
function stricter(a: RateLimitDecision, b: RateLimitDecision): RateLimitDecision {
  if (a.allowed && b.allowed) {
    return { allowed: true, remaining: Math.min(a.remaining, b.remaining) };
  }

  if (!a.allowed && !b.allowed) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(a.retryAfter ?? 0, b.retryAfter ?? 0),
    };
  }

  return a.allowed ? b : a;
}

export function checkRateLimit(
  request: Request,
  email: string
): RateLimitDecision {
  const keys = buildKeys(request, email);
  const now = Date.now();

  return stricter(
    evaluate(attempts.get(keys.ipKey), MAX_ATTEMPTS, now),
    evaluate(attempts.get(keys.accountKey), ACCOUNT_MAX_ATTEMPTS, now)
  );
}

/** Counts a failure against BOTH the address and the account. */
export function recordFailedAttempt(request: Request, email: string): void {
  const keys = buildKeys(request, email);
  const now = Date.now();

  for (const [key, limit] of [
    [keys.ipKey, MAX_ATTEMPTS],
    [keys.accountKey, ACCOUNT_MAX_ATTEMPTS],
  ] as const) {
    const record = attempts.get(key);

    if (!record || now - record.firstAttempt > WINDOW_MS) {
      attempts.set(key, { count: 1, firstAttempt: now, blocked: false });
      continue;
    }

    record.count += 1;

    if (record.count >= limit) {
      record.blocked = true;
    }
  }
}

/** Clears both counters — used after a successful sign-in. */
export function resetAttempts(request: Request, email: string): void {
  const keys = buildKeys(request, email);
  attempts.delete(keys.ipKey);
  attempts.delete(keys.accountKey);
}