'use server';

import { signOut } from '@/auth';

/**
 * Server action backing the dashboard's "Keluar" button.
 *
 * Delegates to Auth.js `signOut()`, which clears the session cookie using its
 * own secure defaults. No custom cookie handling or session deletion is
 * implemented here.
 */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/admin/login' });
}
