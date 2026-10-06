import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import type { CatalogProduct } from '@/types/product';
import { buildWhatsAppLink, formatPrice } from '@/lib/utils';

/**
 * Gallery / showcase strip — Server Component.
 *
 * Pulls real product images from the database so the section always reflects
 * live catalog data. Nothing is hardcoded.
 */

interface GallerySectionProps {
  products: CatalogProduct[];
  whatsappNumber: string | null;
}

export default function GallerySection({
  products,
  whatsappNumber,
}: GallerySectionProps) {
  if (products.length === 0) return null;

  const href = buildWhatsAppLink(
    whatsappNumber,
    'Halo Studio Marmer, saya ingin melihat koleksi marmer yang tersedia.'
  );

  return (
    <section
      aria-labelledby="galeri-heading"
      className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-16 sm:py-20"
    >
      <div className="flex items-end justify-between gap-6 mb-8 sm:mb-10">
        <div>
          <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-2">
            Galeri
          </span>
          <h2
            id="galeri-heading"
            className="text-2xl sm:text-3xl font-light text-[#1A1A1A] tracking-tight"
          >
            Detail dalam Close-up
          </h2>
        </div>
        <Link
          href="/galeri"
          className="hidden sm:inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#666666] hover:text-[#1A1A1A] transition-colors"
        >
          Lihat Galeri
          <ArrowUpRight size={12} strokeWidth={1.5} />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {products.slice(0, 4).map((product, index) => (
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
              loading={index === 0 ? 'eager' : 'lazy'}
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-[#1A1A1A]/0 group-hover:bg-[#1A1A1A]/35 transition-colors duration-500" />
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-[#1A1A1A]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white font-medium truncate">
                {product.title}
              </p>
              <p className="text-[10px] text-white/75 mt-0.5">
                {formatPrice(product.price)}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {href && (
        <div className="mt-10 sm:hidden">
          <Link
            href="/galeri"
            className="w-full inline-flex items-center justify-center gap-2 border border-[#D8D0C4] text-[#1A1A1A] py-3.5 text-[11px] uppercase tracking-[0.16em] font-medium"
          >
            Lihat Galeri
          </Link>
        </div>
      )}
    </section>
  );
}
