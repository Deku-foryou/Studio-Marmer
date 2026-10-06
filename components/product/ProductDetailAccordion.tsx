'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ProductSpecification } from '@/types/product';

/**
 * Client-only extract of the product detail accordion.
 *
 * The rest of the product detail page is a Server Component; only this
 * disclosure UI needs state, so it is isolated here.
 */

interface ProductDetailAccordionProps {
  specifications: readonly ProductSpecification[];
  craftingTime: string | null;
  weightGrams: number;
}

const SPECS_ANIMATION = {
  animationDelay: '450ms',
  animationFillMode: 'both',
} as const;

export default function ProductDetailAccordion({
  specifications,
  craftingTime,
  weightGrams,
}: ProductDetailAccordionProps) {
  const [activeAccordion, setActiveAccordion] = useState<string | null>('specs');

  const toggleAccordion = (name: string) => {
    setActiveAccordion((current) => (current === name ? null : name));
  };

  const panelClass = (open: boolean) =>
    `overflow-hidden transition-all duration-300 ease-in-out ${
      open ? 'max-h-96 opacity-100 pb-5' : 'max-h-0 opacity-0'
    }`;

  return (
    <div
      className="border-t border-[#E5E1DA] mt-6 animate-fade-in-up"
      style={SPECS_ANIMATION}
    >
      {/* Technical Specifications */}
      <div className="border-b border-[#E5E1DA]">
        <button
          onClick={() => toggleAccordion('specs')}
          className="w-full py-4 flex items-center justify-between text-left text-xs uppercase tracking-widest text-[#1A1A1A] font-medium"
        >
          Technical Specifications
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${
              activeAccordion === 'specs' ? 'rotate-180' : ''
            }`}
          />
        </button>
        <div className={panelClass(activeAccordion === 'specs')}>
          <div className="grid grid-cols-2 gap-3">
            {specifications.map((spec) => (
              <div
                key={spec.label}
                className="border border-[#E5E1DA] bg-white p-3.5"
              >
                <p className="text-[9px] uppercase tracking-wider text-[#999999] mb-1">
                  {spec.label}
                </p>
                <p className="text-xs font-light text-[#1A1A1A]">
                  {spec.value}
                </p>
              </div>
            ))}
            <div className="border border-[#E5E1DA] bg-white p-3.5">
              <p className="text-[9px] uppercase tracking-wider text-[#999999] mb-1">
                Berat
              </p>
              <p className="text-xs font-light text-[#1A1A1A]">
                {weightGrams} gram
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Crafting Time */}
      <div className="border-b border-[#E5E1DA]">
        <button
          onClick={() => toggleAccordion('crafting')}
          className="w-full py-4 flex items-center justify-between text-left text-xs uppercase tracking-widest text-[#1A1A1A] font-medium"
        >
          Pembuatan
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${
              activeAccordion === 'crafting' ? 'rotate-180' : ''
            }`}
          />
        </button>
        <div className={panelClass(activeAccordion === 'crafting')}>
          <p className="text-xs text-[#666666] leading-relaxed font-light">
            {craftingTime
              ? `Estimasi waktu pembuatan ${craftingTime}.`
              : 'Waktu pembuatan dapat dikonfirmasi saat pemesanan.'}
          </p>
        </div>
      </div>

      {/* Shipping & Delivery */}
      <div className="border-b border-[#E5E1DA]">
        <button
          onClick={() => toggleAccordion('shipping')}
          className="w-full py-4 flex items-center justify-between text-left text-xs uppercase tracking-widest text-[#1A1A1A] font-medium"
        >
          Shipping & Delivery
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${
              activeAccordion === 'shipping' ? 'rotate-180' : ''
            }`}
          />
        </button>
        <div className={panelClass(activeAccordion === 'shipping')}>
          <p className="text-xs text-[#666666] leading-relaxed font-light">
            Opsi pengiriman dan estimasi pengiriman dikonfirmasi saat pemesanan.
          </p>
        </div>
      </div>

      {/* Care & Warranty */}
      <div className="border-b border-[#E5E1DA]">
        <button
          onClick={() => toggleAccordion('warranty')}
          className="w-full py-4 flex items-center justify-between text-left text-xs uppercase tracking-widest text-[#1A1A1A] font-medium"
        >
          Care & Warranty
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${
              activeAccordion === 'warranty' ? 'rotate-180' : ''
            }`}
          />
        </button>
        <div className={panelClass(activeAccordion === 'warranty')}>
          <p className="text-xs text-[#666666] leading-relaxed font-light">
            Instruksi perawatan dan ketentuan garansi disertakan pada setiap
            unit.
          </p>
        </div>
      </div>
    </div>
  );
}
