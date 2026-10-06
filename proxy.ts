import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdminRole } from '@/auth.config';

/**
 * Admin route protection (Next.js 16 `proxy.ts`, formerly `middleware.ts`).
 *
 * Guard rules:
 *  - Only `/admin/*` is matched. Customer routes are never touched.
 *  - `/admin/login` is reachable while signed out, otherwise the redirect
 *    below would loop.
 *  - The decision is made purely from the signed session JWT. No Prisma query
 *    runs here - Next.js runs Proxy in a separate optimised context that must
 *    not depend on database drivers, and `auth()` only decrypts the cookie.
 */

const LOGIN_PATH = '/admin/login';

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth?.user ?? null;

  // Already signed in and heading to the login page → go to the dashboard.
  if (pathname === LOGIN_PATH && session) {
    return NextResponse.redirect(new URL('/admin', request.nextUrl.origin));
  }

  // The login page itself is public.
  if (pathname === LOGIN_PATH) {
    return NextResponse.next();
  }

  // No valid session → send to the admin login page.
  if (!session) {
    const loginUrl = new URL(LOGIN_PATH, request.nextUrl.origin);
    // Preserve the intended destination so login can bounce back to it.
    if (pathname !== '/admin') {
      loginUrl.searchParams.set('callbackUrl', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Role comes from the token, not the database.
  if (!isAdminRole(session.role)) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  /**
   * Admin area only. Deliberately excludes every customer route, static assets
   * and the Auth.js API routes themselves.
   */
  matcher: ['/admin/:path*'],
};
