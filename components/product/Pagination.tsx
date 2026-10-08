'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildCatalogHref, readCatalogQuery } from '@/lib/catalog-query';

interface PaginationProps {
  /** 1-based, already clamped by the DAL. */
  currentPage: number;
  totalPages: number;
  /** Products matching the active filters, used for the screen-reader summary. */
  total: number;
}

/**
 * Numbered pagination for the catalog grid.
 *
 * Rendered as real links rather than buttons so every page has an href a visitor
 * can copy, bookmark or open in a new tab, and so the server renders the whole
 * control from the URL. Each href is rebuilt from the current search params, which
 * is what keeps an active category / sort / search attached while paging.
 *
 * Hidden entirely when there is a single page - a lone "1" with two disabled
 * arrows is noise.
 */
export default function Pagination({
  currentPage,
  totalPages,
  total,
}: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Same identity-stability concern as FilterContext: a fresh object per render
  // would make `hrefs` a new array every time.
  const paramsKey = searchParams.toString();
  const query = useMemo(
    () => readCatalogQuery(new URLSearchParams(paramsKey)),
    [paramsKey]
  );

  const hrefFor = (page: number) =>
    buildCatalogHref(pathname, { ...query, page }, { scrollToCatalog: true });

  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Navigasi halaman katalog"
      className="mt-12 sm:mt-14 border-t border-[#E5E1DA] pt-8 sm:pt-10"
    >
      <p className="sr-only" aria-live="polite">
        Halaman {currentPage} dari {totalPages}, {total} produk ditemukan.
      </p>

      {/* `flex-wrap` keeps long page lists on one row on desktop without ever
          forcing a horizontal scrollbar on a narrow phone. */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {currentPage > 1 ? (
          <Link
            href={hrefFor(currentPage - 1)}
            rel="prev"
            aria-label="Halaman sebelumnya"
            className="inline-flex items-center gap-1.5 min-w-[44px] h-11 px-3 border border-[#E5E1DA] bg-white text-[11px] uppercase tracking-[0.16em] text-[#666666] transition-colors duration-300 hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
          >
            <ChevronLeft size={13} strokeWidth={1.5} />
            <span className="hidden sm:inline">Sebelumnya</span>
          </Link>
        ) : (
          <span
            aria-disabled="true"
            aria-label="Halaman sebelumnya"
            className="inline-flex items-center gap-1.5 min-w-[44px] h-11 px-3 border border-[#EFEDE9] text-[11px] uppercase tracking-[0.16em] text-[#C9C4BC] cursor-not-allowed select-none"
          >
            <ChevronLeft size={13} strokeWidth={1.5} />
            <span className="hidden sm:inline">Sebelumnya</span>
          </span>
        )}

        {buildPageWindow(currentPage, totalPages).map((entry, index) =>
          entry === GAP ? (
            <span
              key={`gap-${index}`}
              aria-hidden="true"
              className="inline-flex items-center justify-center w-8 h-11 text-[11px] text-[#C9C4BC]"
            >
              …
            </span>
          ) : (
            <Link
              key={entry}
              href={hrefFor(entry)}
              aria-label={`Halaman ${entry}`}
              aria-current={entry === currentPage ? 'page' : undefined}
              className={
                entry === currentPage
                  ? 'inline-flex items-center justify-center min-w-[40px] h-11 px-3 border border-[#1A1A1A] bg-[#1A1A1A] text-[11px] uppercase tracking-[0.16em] text-white'
                  : 'inline-flex items-center justify-center min-w-[40px] h-11 px-3 border border-[#E5E1DA] bg-white text-[11px] uppercase tracking-[0.16em] text-[#666666] transition-colors duration-300 hover:border-[#1A1A1A] hover:text-[#1A1A1A]'
              }
            >
              {entry}
            </Link>
          )
        )}

        {currentPage < totalPages ? (
          <Link
            href={hrefFor(currentPage + 1)}
            rel="next"
            aria-label="Halaman berikutnya"
            className="inline-flex items-center gap-1.5 min-w-[44px] h-11 px-3 border border-[#E5E1DA] bg-white text-[11px] uppercase tracking-[0.16em] text-[#666666] transition-colors duration-300 hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
          >
            <span className="hidden sm:inline">Berikutnya</span>
            <ChevronRight size={13} strokeWidth={1.5} />
          </Link>
        ) : (
          <span
            aria-disabled="true"
            aria-label="Halaman berikutnya"
            className="inline-flex items-center gap-1.5 min-w-[44px] h-11 px-3 border border-[#EFEDE9] text-[11px] uppercase tracking-[0.16em] text-[#C9C4BC] cursor-not-allowed select-none"
          >
            <span className="hidden sm:inline">Berikutnya</span>
            <ChevronRight size={13} strokeWidth={1.5} />
          </span>
        )}
      </div>
    </nav>
  );
}

/** Sentinel for an elided run of page numbers. */
const GAP = -1;

/**
 * Page numbers worth showing: always the first and last page, plus a small
 * window around the current one. Without the outer anchors a 40-page catalog
 * would render 40 buttons.
 */
function buildPageWindow(current: number, total: number): number[] {
  const window = 1;
  const pages = new Set<number>([1, total]);

  for (
    let page = Math.max(1, current - window);
    page <= Math.min(total, current + window);
    page++
  ) {
    pages.add(page);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out: number[] = [];

  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) out.push(GAP);
    out.push(page);
  });

  return out;
}