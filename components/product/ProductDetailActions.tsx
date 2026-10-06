'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';
import type { CatalogProduct } from '@/types/product';

/**
 * Client-only extract of the product detail purchase actions.
 *
 * The parent page is a Server Component; only these buttons need the cart
 * context and local pending state, so they are isolated here.
 */

interface ProductDetailActionsProps {
  product: CatalogProduct;
  /** Mobile bottom bar label, shorter than the desktop CTA. */
  compactLabel: string;
  fullLabel: string;
  pendingLabel: string;
}

export default function ProductDetailActions({
  product,
  compactLabel,
  fullLabel,
  pendingLabel,
}: ProductDetailActionsProps) {
  const { addToCart, openDrawer } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const soldOut = !product.isAvailable;

  const handleAddToCart = () => {
    setIsAdding(true);
    addToCart(product);
    setTimeout(() => {
      setIsAdding(false);
      openDrawer();
    }, 600);
  };

  return (
    <>
      {/* ─── Sticky bottom bar for mobile ───────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FBF9F6]/95 backdrop-blur-md border-t border-[#E5E1DA] px-6 py-4 z-40 flex items-center justify-between shadow-sm md:px-12 md:hidden">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest text-[#999999]">
            {product.brand}
          </span>
          <span className="text-xs font-medium text-[#1A1A1A] truncate max-w-[150px]">
            {product.title}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-[#1A1A1A]">
            {formatPrice(product.price)}
          </span>
          <button
            onClick={handleAddToCart}
            disabled={isAdding || soldOut}
            className="bg-[#1A1A1A] text-white hover:bg-[#333333] transition-colors px-6 py-3 text-[10px] tracking-widest uppercase font-semibold disabled:opacity-40 cursor-pointer"
          >
            {soldOut ? 'Stok Habis' : isAdding ? 'Menambah...' : compactLabel}
          </button>
        </div>
      </div>

      {/* ─── Standard buy section button (Desktop) ───────────────── */}
      <div
        className="hidden md:block max-w-md ml-auto mt-12 animate-fade-in-up"
        style={{ animationDelay: '550ms', animationFillMode: 'both' }}
      >
        <button
          onClick={handleAddToCart}
          disabled={isAdding || soldOut}
          className="w-full bg-[#1A1A1A] text-white hover:bg-[#333333] transition-all duration-300 py-4 text-xs tracking-widest uppercase font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {soldOut
            ? 'Stok Habis'
            : isAdding
              ? pendingLabel
              : fullLabel}
        </button>
      </div>
    </>
  );
}
