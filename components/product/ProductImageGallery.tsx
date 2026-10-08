'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Product image gallery — Client Component.
 *
 * This is the only interactive island on the product detail page besides the
 * accordion, so image selection state is isolated here rather than making the
 * whole page a Client Component.
 *
 * The first image is the LCP element and is rendered eagerly; thumbnails are
 * lazy.
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

  // A product normally has at least one image. When none has been uploaded yet
  // the frame renders empty instead of substituting a stock photograph, which
  // would misrepresent a piece the studio has not actually photographed.
  const images = imageUrls;
  const activeSrc = images.length > 0 ? images[Math.min(activeIndex, images.length - 1)] : null;

  return (
    <div className="flex flex-col gap-3">
      {/* ─── Main image ───────────────────────────────────────────── */}
      <div className="relative aspect-[4/3] w-full overflow-hidden border border-[#E5E1DA] bg-white group">
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
              Foto forthcoming
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
      </div>

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
              aria-selected={index === activeIndex}
              aria-label={`Lihat foto ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'relative aspect-square overflow-hidden border transition-colors duration-300',
                index === activeIndex
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
    </div>
  );
}
