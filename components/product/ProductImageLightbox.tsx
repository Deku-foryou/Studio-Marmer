'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Fullscreen product photo viewer — Client Component.
 *
 * Rendered in a portal on `document.body`, which is not a styling preference:
 * the gallery sits inside an `animate-fade-in-up` wrapper whose final keyframe is
 * `transform: translateY(0)` with `forwards` fill. A persisted non-`none`
 * transform turns that wrapper into the containing block for every
 * `position: fixed` descendant, so an overlay rendered in place would be
 * clamped to the gallery's box instead of covering the viewport. The portal
 * escapes that ancestor entirely.
 *
 * The component is fully controlled: the gallery owns `index` and both
 * handlers, so closing the lightbox leaves the page on the photo the visitor
 * was last looking at.
 *
 * KEYBOARD OWNERSHIP
 * Keys are handled on `document` only while open. The two other handlers on the
 * storefront cannot collide: `NavbarSearch` binds Escape to its own input and
 * only acts while that dropdown is open, and opening this dialog moves focus
 * here, so the input is never the event target. `AdminSidebar` listens for
 * Escape too, but only exists in the admin area, which this page never mounts.
 * Tab is additionally trapped inside the dialog, so focus cannot reach the
 * page behind it.
 */

interface ProductImageLightboxProps {
  images: readonly string[];
  /** Index of the photo currently shown. */
  index: number;
  alt: string;
  isOpen: boolean;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Focused on open, and refocused on close so keyboard users resume in place. */
  returnFocusRef: React.RefObject<HTMLElement | null>;
}

/** Never used as a real URL - only as a layout placeholder before decode. */
const PLACEHOLDER_WIDTH = 1600;
const PLACEHOLDER_HEIGHT = 1200;

export default function ProductImageLightbox({
  images,
  index,
  alt,
  isOpen,
  onIndexChange,
  onClose,
  returnFocusRef,
}: ProductImageLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  /**
   * Natural dimensions of the decoded photo, fed back into the `width`/`height`
   * props. This is what makes the element box match the picture exactly, so
   * "the dark area outside the image" is genuinely outside it and the backdrop
   * click is unambiguous.
   */
  const [natural, setNatural] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const count = images.length;
  const src = images[index] ?? null;

  // A new photo has different proportions; drop the previous measurement
  // instead of briefly laying the next photo out at the old one's ratio.
  //
  // Uses React's documented "adjusting state while rendering" pattern — the
  // comparison and the reset both run during render, so React re-renders at once
  // without committing a frame at the stale ratio. Doing this in an effect is
  // what `react-hooks/set-state-in-effect` reports.
  const [measuredSrc, setMeasuredSrc] = useState(src);

  if (src !== measuredSrc) {
    setMeasuredSrc(src);
    setNatural(null);
  }

  const goTo = useCallback(
    (delta: number) => {
      if (count < 2) return;
      // Modulo with a positive addend: keeps -1 and +count in range.
      onIndexChange((index + delta + count) % count);
    },
    [count, index, onIndexChange]
  );

  // ─── Modal behaviour ───────────────────────────────────────────────────────

  // Lock the page behind the overlay. Restores the previous inline value rather
  // than clearing it, so it cannot clobber a lock set by something else.
  useEffect(() => {
    if (!isOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Move focus in on open, and hand it back on close. The trigger node is read
  // once here: it is the same element for the whole time the dialog is open, and
  // reading it again during cleanup is exactly the staleness the lint rule warns
  // about.
  useEffect(() => {
    if (!isOpen) return;

    const trigger = returnFocusRef.current;
    closeRef.current?.focus();

    return () => {
      trigger?.focus();
    };
  }, [isOpen, returnFocusRef]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          onClose();
          return;

        case 'ArrowLeft':
          event.preventDefault();
          goTo(-1);
          return;

        case 'ArrowRight':
          event.preventDefault();
          goTo(1);
          return;

        case 'Tab': {
          // Keep focus inside the dialog. Without this, Tab walks into the page
          // behind the overlay and the visitor is tabbing through invisible
          // controls with no way to tell where they are.
          const node = dialogRef.current;
          if (!node) return;

          const focusable = node.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;

          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (!first || !last) return;

          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
          return;
        }

        default:
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goTo, onClose]);

  if (!isOpen || !src) return null;

  const hasMultiple = count > 1;

  // Only ever rendered from a click handler, so `document` always exists here;
  // nothing is portalled during server rendering.
  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto produk — ${alt}`}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8 animate-fade-in"
    >
      {/* ─── Close ────────────────────────────────────────────────── */}
      <div
        className="absolute top-3 right-3 sm:top-5 sm:right-5 z-20"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Tutup tampilan foto"
          className="inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/20 text-white transition-colors duration-300 backdrop-blur-sm"
        >
          <X size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      {/* ─── Prev / next ──────────────────────────────────────────── */}
      {hasMultiple && (
        <div
          className="absolute inset-y-0 left-0 right-0 z-20 flex items-center justify-between px-2 sm:px-4 pointer-events-none"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => goTo(-1)}
            aria-label="Foto sebelumnya"
            className="pointer-events-auto inline-flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 bg-white/10 hover:bg-white/25 text-white transition-colors duration-300 backdrop-blur-sm"
          >
            <ChevronLeft size={24} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => goTo(1)}
            aria-label="Foto berikutnya"
            className="pointer-events-auto inline-flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 bg-white/10 hover:bg-white/25 text-white transition-colors duration-300 backdrop-blur-sm"
          >
            <ChevronRight size={24} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ─── Photo ─────────────────────────────────────────────────── */}
      {/*
        Clicking the photo must not dismiss the dialog, so propagation stops
        here. The wrapper is sized by the image itself, which means the padding
        around it belongs to the dialog element: a click there is genuinely
        "outside the image" and closes.
      */}
      <div onClick={(event) => event.stopPropagation()}>
        <Image
          key={src}
          src={src}
          alt={alt}
          width={natural?.width ?? PLACEHOLDER_WIDTH}
          height={natural?.height ?? PLACEHOLDER_HEIGHT}
          /*
           * `sizes="100vw"` is what makes this the highest-resolution view the
           * CDN will serve: the inline gallery image is capped at 50vw, so the
           * same photo is fetched again, larger, only when it is actually
           * opened.
           */
          sizes="100vw"
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            setNatural((previous) =>
              previous &&
              previous.width === naturalWidth &&
              previous.height === naturalHeight
                ? previous
                : { width: naturalWidth, height: naturalHeight }
            );
          }}
          className="max-w-full max-h-[85vh] sm:max-h-[88vh] w-auto h-auto object-contain"
        />
      </div>

      {/* ─── Position indicator ───────────────────────────────────── */}
      {hasMultiple && (
        <p
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-black/50 text-white text-[11px] uppercase tracking-[0.16em] font-medium tabular-nums backdrop-blur-sm"
          onClick={(event) => event.stopPropagation()}
        >
          {index + 1} / {count}
        </p>
      )}
    </div>,
    document.body
  );
}