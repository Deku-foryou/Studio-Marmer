'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * Admin sign-in form — Client Component.
 *
 * Internal staff login only. There is no registration, no password reset and no
 * social sign-in by design.
 *
 * Security notes:
 *  - The generic message shown for every failure comes from the server; this
 *    component never inspects which credential was wrong.
 *  - `password` is held only in local component state for the duration of the
 *    submit and is never written to storage or logged.
 */

const GENERIC_ERROR = 'Email atau password salah.';

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Collapse every server-side failure into one message so nothing is
        // revealed about whether the account exists.
        setError(GENERIC_ERROR);
        setPassword('');
        return;
      }

      // Full navigation so the new session cookie is picked up by proxy.ts on
      // the way to the dashboard.
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setPassword('');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2.5 border border-[#C4553D]/40 bg-[#C4553D]/5 px-4 py-3"
        >
          <AlertCircle
            size={15}
            className="text-[#C4553D] mt-0.5 flex-shrink-0"
            aria-hidden="true"
          />
          <p className="text-xs text-[#C4553D] leading-relaxed">{error}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="admin-email"
          className="block text-[10px] uppercase tracking-[0.16em] text-[#666666] font-medium mb-2"
        >
          Email
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          placeholder="nama@studio-marmer.com"
          className="w-full bg-white border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-sm text-[#1A1A1A] px-4 py-3 font-light transition-colors disabled:opacity-60"
        />
      </div>

      <div>
        <label
          htmlFor="admin-password"
          className="block text-[10px] uppercase tracking-[0.16em] text-[#666666] font-medium mb-2"
        >
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          placeholder="••••••••"
          className="w-full bg-white border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-sm text-[#1A1A1A] px-4 py-3 font-light transition-colors disabled:opacity-60"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full inline-flex items-center justify-center gap-2.5 bg-[#1A1A1A] text-white py-3.5 text-[11px] uppercase tracking-[0.16em] font-medium hover:bg-[#333333] transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            Memproses...
          </>
        ) : (
          'Masuk'
        )}
      </button>
    </form>
  );
}
