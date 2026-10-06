'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteProduct } from './actions';

/**
 * Delete control — Client Component.
 *
 * Requires an explicit typed confirmation before the server action runs, so a
 * mis-click cannot remove a product. The action itself re-checks the session
 * and role server-side; hiding this button is not the authorization.
 */
export function DeleteProductButton({
  productId,
  productName,
}: {
  productId: number;
  productName: string;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!isConfirming) {
    return (
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        className="inline-flex items-center gap-1.5 border border-[#E5E1DA] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[#C4553D] hover:bg-[#C4553D] hover:text-white transition-colors"
        aria-label={`Hapus ${productName}`}
      >
        <Trash2 size={11} strokeWidth={1.5} aria-hidden="true" />
        Hapus
      </button>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-label={`Konfirmasi hapus ${productName}`}
      className="fixed inset-0 z-[130] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#1A1A1A]/45 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm border border-[#E5E1DA] bg-white p-6">
        <h2 className="text-sm font-light text-[#1A1A1A] mb-2">
          Hapus produk ini?
        </h2>
        <p className="text-xs text-[#666666] leading-relaxed font-light mb-1">
          &ldquo;{productName}&rdquo; akan dihapus permanen.
        </p>
        <p className="text-xs text-[#999999] leading-relaxed font-light mb-5">
          Seluruh foto produk ikut terhapus. Tindakan ini tidak dapat dibatalkan.
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => void deleteProduct(productId))}
            className="inline-flex items-center gap-1.5 bg-[#C4553D] text-white px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] font-medium hover:bg-[#A8452F] transition-colors disabled:opacity-60"
          >
            {pending ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setIsConfirming(false)}
            className="inline-flex items-center border border-[#E5E1DA] px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-[#1A1A1A] hover:bg-[#FBF9F6] transition-colors disabled:opacity-60"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
