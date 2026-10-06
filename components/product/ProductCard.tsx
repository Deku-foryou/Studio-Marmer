'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Plus, ArrowUpRight } from 'lucide-react';
import type { Product } from '@/types/product';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
}

function StatusTag({ product }: { product: Product }) {
  if (product.stockStatus === 'Limited Stock') {
    return (
      <span className="text-[10px] uppercase tracking-[0.18em] text-[#8B7355] font-medium">
        · Limited
      </span>
    );
  }
  if (product.isTrending) {
    return (
      <span className="text-[10px] uppercase tracking-[0.18em] text-[#666666] font-medium">
        · Trending
      </span>
    );
  }
  if (product.isNewArrival) {
    return (
      <span className="text-[10px] uppercase tracking-[0.18em] text-[#666666] font-medium">
        · New
      </span>
    );
  }
  return null;
}

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const { addToCart, openDrawer } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = () => {
    setIsAdding(true);
    addToCart(product);
    setTimeout(() => {
      setIsAdding(false);
      openDrawer();
    }, 500);
  };

  return (
    <div
      className="group flex flex-col h-full bg-white border border-[#E5E1DA] hover:border-[#1A1A1A] p-4 rounded-none transition-all duration-500 ease-out hover:shadow-md"
      role="article"
      aria-label={product.title}
    >
      {/* ─── Image ──────────────────────────────────────────── */}
      <Link
        href={`/product/${product.id}`}
        className="relative aspect-[4/3] overflow-hidden rounded-none bg-[#F3F1EE] cursor-pointer block"
      >
        <Image
          src={product.imageUrl}
          alt={product.imageAlt}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />

        {/* Minimal quick-view hint */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500 flex items-end justify-end p-4 opacity-0 group-hover:opacity-100">
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] font-medium text-white bg-[#1A1A1A]/80 backdrop-blur-sm px-3 py-1.5 rounded-none">
            View
            <ArrowUpRight size={10} strokeWidth={2} />
          </span>
        </div>

        {/* Discount chip */}
        {product.discountPercentage > 0 && (
          <div className="absolute top-3 left-3">
            <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[#1A1A1A] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-none">
              −{product.discountPercentage}%
            </span>
          </div>
        )}
      </Link>

      {/* ─── Content ────────────────────────────────────────── */}
      <div className="pt-4 flex flex-col gap-2.5 flex-grow justify-between">
        <div className="flex flex-col gap-2">
          {/* Brand + status */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#999999] font-medium">
              {product.brand}
            </span>
            <StatusTag product={product} />
          </div>

          {/* Title */}
          <h3 className="text-[14px] font-medium text-[#1A1A1A] leading-snug line-clamp-2 -mt-0.5 min-h-[40px]">
            <Link href={`/product/${product.id}`} className="hover:opacity-75 transition-opacity">
              {product.title}
            </Link>
          </h3>
        </div>

        <div>
          {/* Price */}
          <div className="flex items-baseline gap-2.5 mb-3">
            <span className="text-[16px] font-semibold text-[#1A1A1A] tracking-tight">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice > product.price && (
              <span className="text-[13px] text-[#C9C4BC] line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>

          {/* Add to Cart */}
          <button
            id={`add-to-cart-${product.id}`}
            onClick={handleAddToCart}
            disabled={isAdding || product.stockStatus === 'Out of Stock'}
            className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] text-white rounded-none py-2.5 text-[12px] uppercase tracking-[0.12em] font-medium hover:bg-[#333333] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            aria-label={`Add ${product.title} to cart`}
          >
            {isAdding ? (
              <>
                <span className="w-3 h-3 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" />
                Adding
              </>
            ) : product.stockStatus === 'Out of Stock' ? (
              'Sold Out'
            ) : (
              <>
                <Plus size={13} strokeWidth={1.5} />
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
