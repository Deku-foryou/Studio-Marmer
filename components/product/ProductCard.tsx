import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { CatalogProduct } from '@/types/product';
import { formatPrice } from '@/lib/utils';

/**
 * Marble product card — Server Component.
 *
 * Adapted from the existing template card (same structure, spacing tokens and
 * hover behaviour) but with commerce-agnostic content: no cart, no brand, no
 * electronics labels. The single action is "Lihat Produk".
 *
 * There is deliberately no sold-out state here. The only consumer is
 * ProductGrid, and both of its data sources (`getCatalogProducts` and
 * `getFeaturedProducts`) filter on `isAvailable: true`, so a sold-out piece can
 * never reach this component - the overlay and the muted price were unreachable
 * code. Availability is still shown honestly per product via the isAvailable
 * flag, and the product detail page keeps its own sold-out handling, which is
 * reachable there because `getProductBySlug` does not filter.
 *
 * It holds no state and registers no event handlers, so it is deliberately NOT
 * a Client Component - that keeps it out of the client bundle.
 */
interface ProductCardProps {
  product: CatalogProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <article
      className="group flex flex-col h-full bg-white border border-[#E5E1DA] hover:border-[#1A1A1A] p-4 rounded-none transition-all duration-500 ease-out hover:shadow-md"
      aria-label={product.title}
    >
      {/* ─── Image ─────────────────────────────────────────────────── */}
      <Link
        href={`/produk/${product.slug}`}
        className="relative aspect-[4/3] overflow-hidden rounded-none bg-[#F3F1EE] cursor-pointer block"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Image
          src={product.imageUrl}
          alt={product.imageAlt}
          fill
          loading="lazy"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />

        {/* One of a kind */}
        {product.isUniquePiece && (
          <div className="absolute top-3 left-3">
            <span className="text-[9px] uppercase tracking-[0.16em] font-medium text-white bg-[#1A1A1A]/85 backdrop-blur-sm px-2.5 py-1">
              Satu-satunya
            </span>
          </div>
        )}

        {/* Discount */}
        {product.discountPercentage > 0 && (
          <div className="absolute top-3 right-3">
            <span className="text-[9px] uppercase tracking-[0.15em] font-semibold text-[#8B7355] bg-white/90 backdrop-blur-sm px-2.5 py-1">
              −{product.discountPercentage}%
            </span>
          </div>
        )}
      </Link>

      {/* ─── Content ───────────────────────────────────────────────── */}
      <div className="pt-4 flex flex-col gap-2.5 flex-grow justify-between">
        <div className="flex flex-col gap-2">
          {/* Category + availability */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.18em] text-[#999999] font-medium">
              {product.category}
            </span>
            <span className="text-[9px] uppercase tracking-[0.18em] font-medium text-[#8B7355]">
              • Tersedia
            </span>
          </div>

          {/* Name */}
          <h3 className="text-[14px] font-medium text-[#1A1A1A] leading-snug line-clamp-2 min-h-[40px]">
            <Link
              href={`/produk/${product.slug}`}
              className="hover:opacity-75 transition-opacity"
            >
              {product.title}
            </Link>
          </h3>
        </div>

        <div>
          {/* Price */}
          <div className="mb-3">
            {product.pricingType === 'STARTING_FROM' && (
              <span className="block text-[9px] uppercase tracking-[0.16em] text-[#999999] mb-0.5">
                Mulai dari
              </span>
            )}
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[15px] font-medium tracking-tight text-[#1A1A1A]">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice !== null &&
                product.originalPrice > product.price && (
                  <span className="text-[12px] text-[#C9C4BC] line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
            </div>
          </div>

          {/* Single action */}
          <Link
            href={`/produk/${product.slug}`}
            className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] text-white rounded-none py-2.5 text-[11px] uppercase tracking-[0.14em] font-medium hover:bg-[#333333] transition-all duration-300"
            aria-label={`Lihat produk ${product.title}`}
          >
            Lihat Produk
            <ArrowUpRight size={12} strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </article>
  );
}
