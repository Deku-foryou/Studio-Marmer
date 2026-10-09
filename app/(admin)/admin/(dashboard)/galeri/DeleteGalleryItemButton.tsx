'use client';

import { useState, useTransition } from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';

import { deleteGalleryItem } from './actions';
import { useToast } from '@/components/admin/ToastProvider';
import { ADMIN_TOASTS } from '@/lib/admin/toast';

/**
 * Delete control for one gallery photograph — Client Component.
 *
 * Requires an explicit typed confirmation, so a mis-click in a grid of thumbnails
 * cannot remove the wrong photo. The action itself re-checks the session and role
 * server-side; hiding this button is not the authorization.
 *
 * Failure keeps the dialog open with the reason inline — it is scoped to the exact
 * thing being confirmed. Success raises a toast and closes the dialog, because the
 * row it referred to no longer exists.
 *
 * No redirect happens here, so the toast is raised directly instead of through the
 * URL: the dashboard layout — and with it the provider holding this queue — is
 * still mounted.
 */
export default function DeleteGalleryItemButton({
  itemId,
  itemTitle,
}: {
  itemId: number;
  itemTitle: string;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { notify } = useToast();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGalleryItem(itemId);

      if (result.success) {
        notify(ADMIN_TOASTS['galeri-dihapus']);
        setIsConfirming(false);
        return;
      }

      // A rejection keeps the dialog open so the reason stays visible.
      setError(result.error);
    });
  }

  if (!isConfirming) {
    return (
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        className="inline-flex items-center gap-1.5 border border-[#E5E1DA] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[#C4553D] hover:bg-[#C4553D] hover:text-white transition-colors"
        aria-label={`Hapus ${itemTitle}`}
      >
        <Trash2 size={11} strokeWidth={1.5} aria-hidden="true" />
        Hapus
      </button>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-label={`Konfirmasi hapus ${itemTitle}`}
      className="fixed inset-0 z-[130] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-[#1A1A1A]/45 backdrop-blur-sm" aria-hidden="true" />

      <div className="relative w-full max-w-sm border border-[#E5E1DA] bg-white p-6">
        <h2 className="text-sm font-light text-[#1A1A1A] mb-2">
          Hapus foto ini?
        </h2>
        <p className="text-xs text-[#666666] leading-relaxed font-light mb-1">
          &ldquo;{itemTitle}&rdquo; akan dihapus dari daftar galeri.
        </p>
        <p className="text-xs text-[#999999] leading-relaxed font-light mb-5">
          Tindakan ini tidak dapat dibatalkan. Foto di Cloudinary tidak ikut terhapus.
        </p>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 border border-[#C4553D]/40 bg-[#C4553D]/5 px-3 py-2.5 mb-4"
          >
            <AlertCircle
              size={14}
              className="text-[#C4553D] mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
            <p className="text-[11px] text-[#C4553D] leading-relaxed">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 bg-[#C4553D] text-white px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] font-medium hover:bg-[#A8452F] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pending ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setIsConfirming(false);
            }}
            className="inline-flex items-center border border-[#E5E1DA] px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-[#1A1A1A] hover:bg-[#FBF9F6] transition-colors disabled:opacity-60"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}