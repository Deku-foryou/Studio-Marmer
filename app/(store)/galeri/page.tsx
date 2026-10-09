import type { Metadata } from 'next';
import Image from 'next/image';
import { BRAND } from '@/lib/brand';
import { getGalleryPhotos } from '@/lib/data/gallery';
import { getSiteSettings } from '@/lib/data/site';
import WhatsAppCta from '@/components/sections/WhatsAppCta';

export const metadata: Metadata = {
  title: `Galeri — ${BRAND.name}`,
  description:
    'Kumpulan karya kerajinan marmer: tempat tisu, tempat soap, holder, nampan, coaster, dan vas.',
  alternates: { canonical: '/galeri' },
};

/**
 * Gallery page — Server Component.
 *
 * Reads the photographs admins publish from the `gallery_images` table through
 * lib/data/gallery.ts. There is no hardcoded image array and no product fallback:
 * what appears here is exactly what an admin chose to publish, ordered by
 * `sortOrder`. A gallery that has not been filled in yet renders an empty state,
 * because substituting sample content would show the visitor work that was never
 * published.
 *
 * Only `isActive` rows reach this page (the filter lives in the DAL, so it cannot
 * be forgotten at a call site), and the ordering ends on `id` so two photos left at
 * the same sortOrder keep a stable sequence between renders.
 */
export default async function GalleryPage() {
  const [photos, settings] = await Promise.all([
    getGalleryPhotos(),
    getSiteSettings(),
  ]);

  return (
    <main className="bg-[#FBF9F6]">
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pt-16 sm:pt-24 pb-10 sm:pb-14">
        <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-3">
          Galeri
        </span>
        <h1 className="text-[clamp(2rem,4.5vw,3.4rem)] font-light leading-[1.12] tracking-tight text-[#1A1A1A] max-w-3xl mb-4">
          Bentuk, tekstur, dan warna.
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed font-light max-w-xl">
          Potongan marmer yang dipahat satu per satu. Karena berasal dari alam,
          setiap karya punya urat dan warna yang tidak pernah sama.
        </p>
      </section>

      {photos.length === 0 ? (
        <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pb-24">
          <div className="border border-[#E5E1DA] bg-white py-16 px-6 text-center">
            <p className="text-sm font-light text-[#1A1A1A] mb-1">
              Galeri sedang diisi.
            </p>
            <p className="text-xs text-[#999999] font-light max-w-md mx-auto leading-relaxed">
              Foto karya terbaru akan tampil di sini. Sementara itu, silakan
              hubungi kami untuk menanyakan collections yang tersedia.
            </p>
          </div>
        </section>
      ) : (
        <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pb-16 sm:pb-20">
          <ul className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {photos.map((photo, index) => (
              <li
                key={photo.id}
                className="group relative aspect-square overflow-hidden border border-[#E5E1DA] bg-[#F3F1EE]"
              >
                {/*
                  `fill` inside an `aspect-square` frame: the tile has its height
                  from the aspect ratio before the image loads, so nothing shifts
                  as the grid fills in. `sizes` matches the rendered width at each
                  breakpoint, which is what lets the optimiser pick a sensible
                  source rather than the full-width original.
                */}
                <Image
                  src={photo.imageUrl}
                  alt={photo.altText}
                  fill
                  loading={index < 3 ? 'eager' : 'lazy'}
                  sizes="(max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-[#1A1A1A]/0 group-hover:bg-[#1A1A1A]/35 transition-colors duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-[#1A1A1A]/80 to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-500">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white font-medium truncate">
                    {photo.title}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <WhatsAppCta settings={settings} />
    </main>
  );
}