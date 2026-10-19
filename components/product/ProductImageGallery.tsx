'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProductImageLightbox from './ProductImageLightbox';

/**
 * Product image gallery — Client Component.
 *
 * This is the only interactive island on the product detail page besides the
 * accordion, so image selection state is isolated here rather than making the
 * whole page a Client Component.
 *
 * The first image is the LCP element and is rendered eagerly; thumbnails are
 * lazy.
 *
 * The main image opens `ProductImageLightbox`, which is controlled by the same
 * `activeIndex` the thumbnails write to — so whichever thumbnail is selected is
 * the photo the lightbox opens on, and closing it leaves the page where the
 * visitor was.
 */

interface ProductImageGalleryProps {
  imageUrls: readonly string[];
  alt: string;
  /** Optional badge overlaid on the main image. */
  overlay?: string;
}

export default function ProductImageGallery({
  imageUrls,
  alt,
  overlay,
}: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  /** Focused when the lightbox closes, so keyboard users resume on the image. */
  const triggerRef = useRef<HTMLButtonElement>(null);

  // A product normally has at least one image. When none has been uploaded yet
  // the frame renders empty instead of substituting a stock photograph, which
  // would misrepresent a piece the studio has not actually photographed.
  const images = imageUrls;
  const safeIndex = Math.min(activeIndex, Math.max(images.length - 1, 0));
  const activeSrc = images.length > 0 ? images[safeIndex] : null;

  return (
    <div className="flex flex-col gap-3">
      {/* ─── Main image ───────────────────────────────────────────── */}
      {/*
        Was a plain `div`; now a `button` so the photo can be opened with
        Enter/Space as well as by pointer, without adding a tab stop that leads
        nowhere. The frame keeps its original box, border, aspect ratio and
        hover behaviour — the button only adds the click affordance.
      */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => activeSrc && setIsLightboxOpen(true)}
        disabled={!activeSrc}
        aria-label={
          activeSrc
            ? images.length > 1
              ? `Perbesar foto ${safeIndex + 1} dari ${images.length}`
              : 'Perbesar foto produk'
            : `${alt} — belum ada foto`
        }
        className={cn(
          'relative aspect-[4/3] w-full overflow-hidden border border-[#E5E1DA] bg-white group block',
          activeSrc ? 'cursor-zoom-in' : 'cursor-default'
        )}
      >
        {activeSrc ? (
          <Image
            key={activeSrc}
            src={activeSrc}
            alt={alt}
            fill
            priority
            className="object-contain mx-auto bg-transparent transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        ) : (
          <div
            role="img"
            aria-label={`${alt} — belum ada foto`}
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#C9C4BC]">
              Belum ada foto
            </span>
          </div>
        )}

        {overlay && (
          <div className="absolute top-4 left-4">
            <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-white bg-[#1A1A1A]/85 backdrop-blur-sm px-3 py-1.5">
              {overlay}
            </span>
          </div>
        )}

        {/*
          Expand hint. Sits bottom-right, opposite the `overlay` badge, and is
          only shown while the frame can be hovered or focused, so the resting
          appearance of the gallery is unchanged.
        */}
        {activeSrc && (
          <span
            aria-hidden="true"
            className="absolute bottom-3 right-3 inline-flex items-center justify-center w-8 h-8 bg-white/85 text-[#1A1A1A] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 pointer-events-none"
          >
            <Maximize2 size={14} strokeWidth={1.5} />
          </span>
        )}
      </button>

      {/* ─── Thumbnails ───────────────────────────────────────────── */}
      {images.length > 1 && (
        <div
          className="grid grid-flow-col auto-cols-[72px] sm:auto-cols-[84px] gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Galeri foto produk"
        >
          {images.map((src, index) => (
            <button
              key={`${src}-${index}`}
              role="tab"
              aria-selected={index === safeIndex}
              aria-label={`Lihat foto ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'relative aspect-square overflow-hidden border transition-colors duration-300',
                index === safeIndex
                  ? 'border-[#1A1A1A]'
                  : 'border-[#E5E1DA] hover:border-[#C9C4BC]'
              )}
            >
              <Image
                src={src}
                alt={`${alt} — foto ${index + 1}`}
                fill
                loading="lazy"
                className="object-cover"
                sizes="84px"
              />
            </button>
          ))}
        </div>
      )}

      {/* ─── Fullscreen viewer ────────────────────────────────────── */}
      {/*
        Mounted unconditionally but renders nothing until opened. It shares
        `activeIndex` with the thumbnails, so it opens on whichever photo is
        currently selected.
      */}
      <ProductImageLightbox
        images={images}
        index={safeIndex}
        alt={alt}
        isOpen={isLightboxOpen}
        onIndexChange={setActiveIndex}
        onClose={() => setIsLightboxOpen(false)}
        returnFocusRef={triggerRef}
      />
    </div>
  );
}
