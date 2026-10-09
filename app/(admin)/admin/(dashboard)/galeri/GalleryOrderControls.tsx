'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp } from 'lucide-react';

import { moveGalleryItem } from './actions';
import { useToast } from '@/components/admin/ToastProvider';
import { ADMIN_TOASTS } from '@/lib/admin/toast';

/**
 * One-place reorder controls for a single gallery item — Client Component.
 *
 * The admin-defined sequence is the `sortOrder` column, and the storefront renders
 * `ORDER BY sortOrder, id`. Rather than making the admin hand-type a number, these
 * buttons ask the server to swap this photo's position with its neighbour in the
 * full ordered set — a swap, not an increment, so photos that share a sortOrder
 * still move exactly one place instead of jumping.
 *
 * A mutation goes through a server action rather than a link with query
 * parameters: changing published content is a write, and a GET that reorders the
 * gallery would let a prefetch or a crawler silently reshuffle the page.
 *
 * The action re-checks the session and role server-side; disabled buttons here are
 * a usability affordance, not the authorization.
 */
export default function GalleryOrderControls({
  itemId,
  itemTitle,
  /** Position in the full ordered list, 0-based. -1 means "not found". */
  position,
  total,
}: {
  itemId: number;
  itemTitle: string;
  position: number;
  total: number;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { notify } = useToast();

  const atStart = position <= 0;
  const atEnd = position < 0 || position >= total - 1;

  function move(direction: -1 | 1) {
    startTransition(async () => {
      const result = await moveGalleryItem(itemId, direction);

      if (!result.success) {
        notify({ tone: 'error', message: result.error });
        return;
      }

      notify(ADMIN_TOASTS['galeri-urutan-diperbarui']);
      // The row's position and sortOrder changed on the server; refresh pulls the
      // new ordering without a full navigation.
      router.refresh();
    });
  }

  const buttonClass =
    'inline-flex items-center border border-[#E5E1DA] px-2.5 py-2 text-[#666666] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <>
      <button
        type="button"
        onClick={() => move(-1)}
        disabled={pending || atStart}
        aria-label={`Naikkan urutan ${itemTitle}`}
        className={buttonClass}
      >
        <ArrowUp size={11} strokeWidth={1.5} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => move(1)}
        disabled={pending || atEnd}
        aria-label={`Turunkan urutan ${itemTitle}`}
        className={buttonClass}
      >
        <ArrowDown size={11} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </>
  );
}