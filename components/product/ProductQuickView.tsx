'use client';

import Image from 'next/image';
import { X, ShoppingCart, Zap } from 'lucide-react';
import type { Product } from '@/types/product';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import { useState, useEffect } from 'react';

interface ProductQuickViewProps {
  product: Product;
  onClose: () => void;
}

export default function ProductQuickView({
  product,
  onClose,
}: ProductQuickViewProps) {
  const { addToCart, openDrawer } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 250);
  };

  const handleAddToCart = () => {
    setIsAdding(true);
    addToCart(product);
    setTimeout(() => {
      setIsAdding(false);
      handleClose();
      openDrawer();
    }, 600);
  };

  return (
    <div
      className={`fixed inset-0 z-[110] flex items-center justify-center p-4 transition-opacity duration-250 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.title}
        className={`relative w-full max-w-3xl bg-white border border-[#E5E1DA] overflow-hidden shadow-xl transition-all duration-350 ${
          isVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95'
        }`}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 text-[#1A1A1A] hover:opacity-60 transition-opacity bg-white/80 border border-[#E5E1DA] rounded-none"
          aria-label="Close quick view"
        >
          <X size={16} />
        </button>

        <div className="grid md:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-square md:aspect-auto md:min-h-[400px] bg-[#FBF9F6]">
            <Image
              src={product.imageUrl}
              alt={product.imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-[#1A1A1A]/5" />
            <div className="absolute top-4 left-4 flex flex-col gap-1.5">
              {product.matchScore >= 90 && (
                <div className="text-[10px] tracking-wider uppercase bg-[#1A1A1A] text-white px-2 py-1 flex items-center gap-1">
                  <Zap size={8} fill="currentColor" />
                  {product.matchScore}% Match
                </div>
              )}
              {product.isTrending && (
                <div className="text-[10px] tracking-wider uppercase bg-white border border-[#E5E1DA] text-[#1A1A1A] px-2 py-1">
                  Trending Selection
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="p-8 flex flex-col gap-5 overflow-y-auto max-h-[80vh] md:max-h-none justify-between bg-white">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#999999] mb-1">
                  {product.brand} · {product.category}
                </p>
                <h2 className="text-2xl font-light text-[#1A1A1A] tracking-tight leading-snug">
                  {product.title}
                </h2>
              </div>

              <p className="text-sm text-[#666666] leading-relaxed font-light">
                {product.shortDescription}
              </p>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {product.specifications.slice(0, 4).map((spec) => (
                  <div key={spec.label} className="border border-[#E5E1DA] bg-[#FBF9F6] p-3 rounded-none">
                    <p className="text-[9px] uppercase tracking-wider text-[#999999] mb-0.5">
                      {spec.label}
                    </p>
                    <p className="text-xs font-light text-[#1A1A1A]">
                      {spec.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-6 pt-4 border-t border-[#E5E1DA]">
              {/* Price + Info */}
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-light text-[#1A1A1A] tracking-tight">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice > product.price && (
                  <span className="text-sm text-[#999999] line-through font-light">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
                {product.discountPercentage > 0 && (
                  <span className="text-[10px] font-medium text-[#1A1A1A] tracking-wider uppercase">
                    Save {product.discountPercentage}%
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {product.stockStatus === 'Limited Stock' && (
                  <span className="text-[10px] tracking-wider uppercase text-red-600 font-medium">⚡ Only {product.stockQuantity} left</span>
                )}
                {product.stockStatus === 'In Stock' && (
                  <span className="text-[10px] tracking-wider uppercase text-emerald-700 font-medium">In Stock</span>
                )}
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isAdding || product.stockStatus === 'Out of Stock'}
                className="bg-[#1A1A1A] text-white hover:bg-[#333333] transition-colors py-3 text-xs tracking-widest uppercase font-medium flex items-center justify-center gap-2 w-full disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isAdding ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adding to Collection…
                  </>
                ) : (
                  <>
                    <ShoppingCart size={14} />
                    {product.stockStatus === 'Out of Stock'
                      ? 'Currently Sold Out'
                      : 'Add to Cart'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
