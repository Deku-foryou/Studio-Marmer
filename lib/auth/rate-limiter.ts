const MAX_ATTEMPTS = Number(process.env.RATE_LIMIT_MAX_ATTEMPTS ?? 10);
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  blocked: boolean;
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

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export function checkRateLimit(
  request: Request,
  email: string
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const ip = getClientIp(request);
  const key = `${ip}:${email.toLowerCase()}`;
  const now = Date.now();

  const record = attempts.get(key);

  if (!record) {
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.delete(key);
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  if (record.blocked) {
    const retryAfter = Math.ceil((record.firstAttempt + WINDOW_MS - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  return {
    allowed: record.count < MAX_ATTEMPTS,
    remaining: Math.max(0, MAX_ATTEMPTS - record.count),
  };
}

export function recordFailedAttempt(request: Request, email: string): void {
  const ip = getClientIp(request);
  const key = `${ip}:${email.toLowerCase()}`;
  const now = Date.now();

  const record = attempts.get(key);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now, blocked: false });
    return;
  }

  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.blocked = true;
  }
}

export function resetAttempts(request: Request, email: string): void {
  const ip = getClientIp(request);
  const key = `${ip}:${email.toLowerCase()}`;
  attempts.delete(key);
}
