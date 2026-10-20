'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#FBF9F6] text-[#1A1A1A] flex items-center justify-center px-6">
      <div className="max-w-md w-full border border-[#E5E1DA] bg-white p-8 text-center">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium mb-3">
          Terjadi Kesalahan
        </p>
        <h1 className="text-2xl font-light tracking-tight mb-3">
          Halaman tidak dapat dimuat
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed mb-6">
          Silakan coba lagi. Jika masalah berlanjut, hubungi administrator.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center bg-[#1A1A1A] text-white px-6 py-3 text-[11px] uppercase tracking-[0.14em] font-medium hover:bg-[#333333] transition-colors"
          >
            Coba lagi
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center border border-[#D8D0C4] text-[#1A1A1A] px-6 py-3 text-[11px] uppercase tracking-[0.14em] font-medium hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-colors"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </main>
  );
}