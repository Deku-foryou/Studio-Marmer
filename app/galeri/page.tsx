import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { BRAND } from '@/lib/brand';
import { getProducts } from '@/lib/data/products';
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
 * Reads real products from the database. Currently the placeholder images are
 * shown; when the client supplies final photography only the image URLs in the
 * database need updating, not this page.
 */
export default async function GalleryPage() {
  const [products, settings] = await Promise.all([
    getProducts(),
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
          Foto di halaman ini masih berupa placeholder selama foto produk asli
          belum tersedia. Struktur galeri sudah siap dan otomatis mengikuti data
          produk.
        </p>
      </section>

      {products.length === 0 ? (
        <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pb-24">
          <p className="text-sm text-[#666666] font-light">
            Belum ada produk untuk ditampilkan.
          </p>
        </section>
      ) : (
        <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pb-16 sm:pb-20">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {products.map((product, index) => (
              <Link
                key={product.id}
                href={`/produk/${product.slug}`}
                className="group relative aspect-square overflow-hidden border border-[#E5E1DA] bg-[#F3F1EE]"
                aria-label={`Lihat ${product.title}`}
              >
                <Image
                  src={product.imageUrl}
                  alt={product.imageAlt}
                  fill
                  loading={index < 3 ? 'eager' : 'lazy'}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-[#1A1A1A]/0 group-hover:bg-[#1A1A1A]/35 transition-colors duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-[#1A1A1A]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white font-medium truncate">
                    {product.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <WhatsAppCta settings={settings} />
    </main>
  );
}
