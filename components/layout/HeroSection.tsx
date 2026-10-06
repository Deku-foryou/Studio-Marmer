'use client';

import { useCart } from '@/context/CartContext';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';

export default function HeroSection() {
  const { openDrawer } = useCart();

  return (
    <section className="relative min-h-[600px] sm:min-h-[700px] flex items-center overflow-hidden bg-[#FBF9F6]">
      {/* ─── Full-width Background Image ─────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/nexus_hero_bg.png"
          alt="Premium luxury technology backdrop"
          fill
          priority
          className="object-cover object-right md:object-center"
        />
        {/* Soft elegant gradient overlay to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FBF9F6] via-[#FBF9F6]/85 to-transparent md:from-[#FBF9F6] md:via-[#FBF9F6]/50 md:to-transparent" />
        {/* Smooth section blend to featured products */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent via-[#FBF9F6]/50 to-[#FBF9F6] pointer-events-none" />
      </div>

      {/* ─── Content ────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pt-20 sm:pt-28 pb-16 sm:pb-24 w-full">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <p
            className="text-[10px] uppercase tracking-[0.25em] text-[#999999] font-medium mb-6 animate-fade-up"
          >
            Curated Collection
          </p>

          {/* Headline */}
          <h1
            className="text-[clamp(2.2rem,6vw,4.8rem)] font-light leading-[1.08] tracking-tight text-[#1A1A1A] mb-6 animate-fade-up"
            style={{ animationDelay: '80ms', animationFillMode: 'both' }}
          >
            The Art of
            <br />
            <span className="font-medium">Craftsmanship</span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-base sm:text-lg text-[#666666] leading-relaxed max-w-lg mb-10 font-light animate-fade-up"
            style={{ animationDelay: '160ms', animationFillMode: 'both' }}
          >
            A considered selection of pieces, chosen for material integrity and
            aesthetic form.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row gap-4 animate-fade-up"
            style={{ animationDelay: '240ms', animationFillMode: 'both' }}
          >
            <a
              href="#products"
              className="bg-[#1A1A1A] text-white hover:bg-[#333333] transition-all duration-300 inline-flex items-center justify-center gap-3 px-8 py-3.5 text-xs uppercase tracking-widest font-medium"
            >
              Explore Collection
              <ArrowRight size={14} strokeWidth={1.5} />
            </a>
            <button
              onClick={openDrawer}
              className="border border-[#E5E1DA] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-all duration-300 inline-flex items-center justify-center gap-3 px-8 py-3.5 text-xs uppercase tracking-widest font-medium bg-transparent"
            >
              View Cart
            </button>
          </div>
        </div>
      </div>

      {/* ─── Hairline separator ──────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 z-10">
        <div className="h-px bg-[#E5E1DA]" />
      </div>

      {/* Scroll anchor */}
      <div id="products" className="h-0 relative -top-24" aria-hidden="true" />
    </section>
  );
}
