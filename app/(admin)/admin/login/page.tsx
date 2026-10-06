import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import AdminLoginForm from './AdminLoginForm';

export const metadata: Metadata = {
  title: 'Masuk',
  description: 'Area internal Studio Marmer.',
};

export default function AdminLoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16 sm:py-24">
      <div className="w-full max-w-sm">
        {/* ─── Wordmark ───────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-block leading-none group"
            aria-label="Kembali ke situs Studio Marmer"
          >
            <span className="block text-[15px] font-light tracking-[0.18em] uppercase text-[#1A1A1A]">
              Studio
            </span>
            <span className="block text-[15px] font-medium tracking-[0.18em] uppercase text-[#1A1A1A]">
              Marmer
            </span>
          </Link>
          <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-[#8B7355] font-medium">
            Admin
          </p>
        </div>

        {/* ─── Panel ──────────────────────────────────────────────── */}
        <div className="border border-[#E5E1DA] bg-white px-6 sm:px-8 py-8">
          <h1 className="text-lg font-light text-[#1A1A1A] tracking-tight mb-1">
            Masuk ke Admin
          </h1>
          <p className="text-xs text-[#666666] font-light mb-6">
            Area internal. Gunakan akun admin yang telah terdaftar.
          </p>

          {/* useSearchParams needs a Suspense boundary during prerender. */}
          <Suspense
            fallback={
              <div className="h-40 flex items-center justify-center text-xs text-[#999999]">
                Memuat...
              </div>
            }
          >
            <AdminLoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-[11px] text-[#999999] font-light">
          <Link href="/" className="hover:text-[#1A1A1A] transition-colors">
            Kembali ke situs
          </Link>
        </p>
      </div>
    </main>
  );
}
