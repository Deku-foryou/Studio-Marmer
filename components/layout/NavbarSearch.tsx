'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { readCatalogQuery, toCatalogSearchParams } from '@/lib/catalog-query';

/**
 * Navbar search box — Client Component.
 *
 * The search term is the `?q=` catalog parameter, so it survives a reload, a
 * share and the back button, and it is applied by the server alongside the
 * other filters. Typing navigates; it no longer mutates a React context that
 * only existed to re-filter an already-downloaded catalog.
 *
 * This is a separate component from Navbar on purpose: it is the only part of
 * the header that reads search params, so only the search box needs to sit
 * behind a Suspense boundary. Everything else in the navbar still renders in the
 * server HTML.
 */

interface NavbarSearchProps {
  /** Desktop shows a clear button and reserves room for it; mobile does not. */
  variant: 'desktop' | 'mobile';
}

const SEARCH_DEBOUNCE_MS = 300;

export default function NavbarSearch({ variant }: NavbarSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Memoized on the serialized params so `query` keeps a stable identity and the
  // debounce below is not re-armed on every unrelated render.
  const paramsKey = searchParams.toString();
  const query = useMemo(
    () => readCatalogQuery(new URLSearchParams(paramsKey)),
    [paramsKey]
  );

  const [value, setValue] = useState(query.search);

  // Keep the input in sync when the query is cleared elsewhere (for example by
  // the "Hapus Filter" button in FilterBar).
  //
  // This uses React's documented "adjusting state when a prop changes" pattern:
  // the comparison and both setState calls run during render, so React
  // re-renders immediately without ever committing an intermediate frame that
  // shows a stale value. Doing the same inside an effect causes a cascading
  // render, which is precisely what `react-hooks/set-state-in-effect` reports.
  const [lastSyncedQuery, setLastSyncedQuery] = useState(query.search);

  if (query.search !== lastSyncedQuery) {
    setLastSyncedQuery(query.search);
    setValue(query.search);
  }

  useEffect(() => {
    // Already in sync — including right after the navigation we triggered, which
    // is what stops the debounce from looping on itself.
    if (value === query.search) return;

    const timer = setTimeout(() => {
      const qs = toCatalogSearchParams({
        ...query,
        search: value,
        page: 1,
      }).toString();
      const href = `/${qs ? `?${qs}` : ''}#katalog`;

      // From the catalog, stay put so the header does not scroll away mid-typing.
      // From another page, land on the grid the search actually filters.
      if (pathname === '/') {
        router.replace(href, { scroll: false });
      } else {
        router.replace(href);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, query, pathname, router]);

  return (
    <div className="relative">
      <Search
        size={15}
        strokeWidth={1.5}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#999999] pointer-events-none"
      />
      <input
        id={variant === 'desktop' ? 'navbar-search' : undefined}
        type="search"
        placeholder="Cari produk…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={
          variant === 'desktop'
            ? 'w-full input-warm rounded-sm pl-10 pr-9 py-2.5 text-[13px] tracking-wide'
            : 'w-full input-warm rounded-sm pl-10 pr-4 py-2.5 text-[13px] tracking-wide'
        }
        autoFocus={variant === 'mobile'}
        aria-label="Cari produk"
      />
      {variant === 'desktop' && value && (
        <button
          onClick={() => setValue('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#1A1A1A] transition-colors"
          aria-label="Hapus pencarian"
        >
          <X size={13} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}

/**
 * Server-rendered stand-in for the search box, used as the Suspense fallback so
 * the header keeps its full height and its input is already in the initial HTML.
 * It is deliberately non-interactive: `readOnly` and a disabled clear button.
 */
export function NavbarSearchSkeleton({ variant }: NavbarSearchProps) {
  return (
    <div className="relative">
      <Search
        size={15}
        strokeWidth={1.5}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#999999] pointer-events-none"
      />
      <input
        type="search"
        placeholder="Cari produk…"
        readOnly
        defaultValue=""
        className={
          variant === 'desktop'
            ? 'w-full input-warm rounded-sm pl-10 pr-9 py-2.5 text-[13px] tracking-wide'
            : 'w-full input-warm rounded-sm pl-10 pr-4 py-2.5 text-[13px] tracking-wide'
        }
        aria-label="Cari produk"
      />
    </div>
  );
}