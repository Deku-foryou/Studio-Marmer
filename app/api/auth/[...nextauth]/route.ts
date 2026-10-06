import { handlers } from '@/auth';

/**
 * Auth.js route handler.
 *
 * Mounts the framework endpoints (sign-in, sign-out, session, CSRF) under
 * `/api/auth/*`. The GET/POST handlers come straight from the configured
 * `NextAuth()` instance.
 */
export const { GET, POST } = handlers;
