'use client';

import Image from 'next/image';
import { X, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';
import CartSummary from '@/components/cart/CartSummary';
import { useState, useEffect } from 'react';

export default function CartDrawer() {
  const { state, closeDrawer, incrementQty, decrementQty, removeFromCart } =
    useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (state.isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [state.isDrawerOpen]);

  if (!mounted) return null;

  return (
    <>
      {/* ─── Backdrop ──────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-[80] bg-[#1A1A1A]/40 backdrop-blur-sm transition-opacity duration-300 ${
          state.isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* ─── Drawer Panel ──────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`fixed right-0 top-0 h-full w-full max-w-[440px] z-[90] flex flex-col transition-transform duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)] bg-white ${
          state.isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ borderLeft: '1px solid #E5E1DA' }}
      >
        {/* ─── Header ────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b border-[#E5E1DA]"
        >
          <div className="flex items-center gap-3">
            <ShoppingBag size={18} className="text-[#1A1A1A]" />
            <h2 className="text-sm uppercase tracking-wider font-light text-[#1A1A1A]">Shopping Bag</h2>
            {state.items.length > 0 && (
              <span className="text-[10px] tracking-wider uppercase font-medium text-white bg-[#1A1A1A] px-2 py-0.5">
                {state.items.reduce((a, i) => a + i.quantity, 0)}
              </span>
            )}
          </div>
          <button
            onClick={closeDrawer}
            className="p-1 text-[#1A1A1A] hover:opacity-60 transition-opacity"
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>

        {/* ─── Empty State ────────────────────────────────────────── */}
        {state.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 bg-[#FBF9F6]">
            <div className="w-20 h-20 border border-[#E5E1DA] bg-white flex items-center justify-center">
              <ShoppingBag size={32} className="text-[#999999]" />
            </div>
            <div className="text-center">
              <p className="text-base font-light text-[#1A1A1A] mb-2">
                Your cart is empty
              </p>
              <p className="text-xs text-[#666666] font-light max-w-[240px] mx-auto leading-relaxed">
                Add an item to your collection.
              </p>
            </div>
            <button
              onClick={closeDrawer}
              className="border border-[#1A1A1A] text-[#1A1A1A] bg-white hover:bg-[#1A1A1A] hover:text-white transition-colors px-6 py-2.5 text-xs uppercase tracking-wider font-medium rounded-none"
            >
              Continue Browsing
            </button>
          </div>
        ) : (
          <>
            {/* ─── Items List ───────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-[#FBF9F6]">
              {state.items.map((item) => (
                <div
                  key={item.product.id}
                  className="border border-[#E5E1DA] bg-white p-4 flex gap-4 animate-fade-up rounded-none"
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 border border-[#E5E1DA] overflow-hidden flex-shrink-0 bg-[#FBF9F6]">
                    <Image
                      src={item.product.imageUrl}
                      alt={item.product.imageAlt}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-[#999999] mb-0.5">
                        {item.product.brand}
                      </p>
                      <p className="text-xs font-medium text-[#1A1A1A] line-clamp-1">
                        {item.product.title}
                      </p>
                    </div>
                    <p className="text-xs font-light text-[#1A1A1A] mt-2">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-[#999999] hover:text-red-600 transition-colors p-1"
                      aria-label={`Remove ${item.product.title}`}
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="flex items-center gap-2 border border-[#E5E1DA] bg-white px-2 py-1">
                      <button
                        onClick={() => decrementQty(item.product.id)}
                        className="text-[#666666] hover:text-[#1A1A1A] transition-colors disabled:opacity-30"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-xs font-light text-[#1A1A1A] min-w-[14px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => incrementQty(item.product.id)}
                        className="text-[#666666] hover:text-[#1A1A1A] transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ─── Footer Section ────────────────────────────────── */}
            <div
              className="px-6 pb-8 pt-6 space-y-4 border-t border-[#E5E1DA] bg-white"
            >
              <CartSummary />
              <button
                onClick={closeDrawer}
                className="w-full text-center text-xs uppercase tracking-wider text-[#999999] hover:text-[#1A1A1A] transition-colors py-1"
              >
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
