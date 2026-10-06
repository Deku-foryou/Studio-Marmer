'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ProductSpecification } from '@/types/product';

/**
 * Client-only extract of the product detail disclosure sections.
 *
 * The parent page is a Server Component; only this accordion needs state, so
 * it is isolated here.
 */

interface ProductDetailAccordionProps {
  specifications: readonly ProductSpecification[];
  material: string | null;
  stoneType: string | null;
  color: string;
  dimensions: string;
  weightGrams: number;
  craftingTime: string | null;
}

const ANIMATION = {
  animationDelay: '450ms',
  animationFillMode: 'both',
} as const;

export default function ProductDetailAccordion({
  specifications,
  material,
  stoneType,
  color,
  dimensions,
  weightGrams,
  craftingTime,
}: ProductDetailAccordionProps) {
  const [active, setActive] = useState<string | null>('specs');

  const toggle = (key: string) =>
    setActive((current) => (current === key ? null : key));

  const panel = (open: boolean) =>
    `overflow-hidden transition-all duration-300 ease-in-out ${
      open ? 'max-h-96 opacity-100 pb-5' : 'max-h-0 opacity-0'
    }`;

  const rowClass =
    'grid grid-cols-2 gap-x-3 gap-y-3 border border-[#E5E1DA] bg-white p-3.5';

  return (
    <div className="border-t border-[#E5E1DA] mt-6 animate-fade-in-up" style={ANIMATION}>
      {/* ─── Spesifikasi ─────────────────────────────────────────── */}
      <div className="border-b border-[#E5E1DA]">
        <button
          onClick={() => toggle('specs')}
          aria-expanded={active === 'specs'}
          className="w-full py-4 flex items-center justify-between text-left text-xs uppercase tracking-widest text-[#1A1A1A] font-medium"
        >
          Spesifikasi
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${active === 'specs' ? 'rotate-180' : ''}`}
          />
        </button>
        <div className={panel(active === 'specs')}>
          {specifications.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {specifications.map((spec) => (
                <div key={spec.label} className={rowClass}>
                  <p className="text-[9px] uppercase tracking-wider text-[#999999] mb-1 col-span-2">
                    {spec.label}
                  </p>
                  <p className="text-xs font-light text-[#1A1A1A] col-span-2">
                    {spec.value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#666666] font-light">
              Spesifikasi detail belum tersedia.
            </p>
          )}
        </div>
      </div>

      {/* ─── Material & Dimensi ───────────────────────────────────── */}
      <div className="border-b border-[#E5E1DA]">
        <button
          onClick={() => toggle('material')}
          aria-expanded={active === 'material'}
          className="w-full py-4 flex items-center justify-between text-left text-xs uppercase tracking-widest text-[#1A1A1A] font-medium"
        >
          Material & Dimensi
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${active === 'material' ? 'rotate-180' : ''}`}
          />
        </button>
        <div className={panel(active === 'material')}>
          <dl className="grid grid-cols-2 gap-3">
            {[
              { label: 'Jenis marmer', value: stoneType },
              { label: 'Material', value: material },
              { label: 'Warna', value: color },
              { label: 'Dimensi', value: dimensions },
              { label: 'Berat', value: `${weightGrams} gram` },
            ].map((row) => (
              <div key={row.label} className={rowClass}>
                <dt className="text-[9px] uppercase tracking-wider text-[#999999] mb-1 col-span-2">
                  {row.label}
                </dt>
                <dd className="text-xs font-light text-[#1A1A1A] col-span-2">
                  {row.value || '—'}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* ─── Pembuatan ────────────────────────────────────────────── */}
      <div className="border-b border-[#E5E1DA]">
        <button
          onClick={() => toggle('crafting')}
          aria-expanded={active === 'crafting'}
          className="w-full py-4 flex items-center justify-between text-left text-xs uppercase tracking-widest text-[#1A1A1A] font-medium"
        >
          Pembuatan
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${active === 'crafting' ? 'rotate-180' : ''}`}
          />
        </button>
        <div className={panel(active === 'crafting')}>
          <p className="text-xs text-[#666666] leading-relaxed font-light">
            {craftingTime
              ? `Estimasi waktu pembuatan ${craftingTime}. Setiap unit marmer dikerjakan dengan tangan, sehingga corak dan ukurannya dapat berbeda satu sama lain.`
              : 'Waktu pembuatan dapat dikonfirmasi melalui WhatsApp.'}
          </p>
        </div>
      </div>

      {/* ─── Perawatan ────────────────────────────────────────────── */}
      <div className="border-b border-[#E5E1DA]">
        <button
          onClick={() => toggle('care')}
          aria-expanded={active === 'care'}
          className="w-full py-4 flex items-center justify-between text-left text-xs uppercase tracking-widest text-[#1A1A1A] font-medium"
        >
          Perawatan
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${active === 'care' ? 'rotate-180' : ''}`}
          />
        </button>
        <div className={panel(active === 'care')}>
          <p className="text-xs text-[#666666] leading-relaxed font-light">
            Bersihkan dengan kain lembut yang lembap. Hindari cairan pembersih
            asam dan benturan keras karena dapat merusak permukaan marmer.
          </p>
        </div>
      </div>
    </div>
  );
}
