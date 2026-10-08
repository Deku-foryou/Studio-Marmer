'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ProductSpecification } from '@/types/product';

/**
 * Client-only extract of the product detail disclosure sections.
 *
 * The parent page is a Server Component; only this accordion needs state, so
 * it is isolated here.
 *
 * SCOPE
 * Only the two factual disclosures remain - Spesifikasi and Material &
 *Dimensi. "Pembuatan" and "Perawatan" were removed: their copy was generic
 * boilerplate repeated on every product rather than anything specific to the
 * piece, and both were duplicated elsewhere (crafting time is already shown as a
 * chip in the info column, and care instructions are the wrong place for a
 * marble studio to bury the facts). Each row is a self-contained
 * `border-b` block, so dropping two of them closes the gap completely - no
 * residual spacing is left behind.
 *
 * `craftingTime` is deliberately no longer a prop here. The value is untouched
 * in the product data; the info column still renders it as a chip.
 */

interface ProductDetailAccordionProps {
  specifications: readonly ProductSpecification[];
  material: string | null;
  stoneType: string | null;
  color: string;
  dimensions: string;
  weightGrams: number;
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
    </div>
  );
}
