'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X, Loader2 } from 'lucide-react';
import {
  CATALOG_ANCHOR,
  buildCatalogHref,
  readCatalogQuery,
} from '@/lib/catalog-query';
import {
  MAX_SEARCH_QUERY_LENGTH,
  SEARCH_SUGGEST_DEBOUNCE_MS,
  debounceAsync,
  fetchProductSuggestions,
  nextActiveIndex,
  normalizeSearchTerm,
  resolveEnterAction,
  shouldFetchSuggestions,
} from '@/lib/product-suggestions';
import { formatPrice } from '@/lib/utils';
import type { ProductSuggestion } from '@/types/product';

/**
 * Navbar search box — Client Component.
 *
 * The search term is the `?q=` catalog parameter, so it survives a reload, a
 * share and the back button, and it is applied by the server alongside the
 * other filters. Typing navigates; it no longer mutates a React context that
 * only existed to re-filter an already-downloaded catalog.
 *
 * ON TOP OF THAT, AN AUTOCOMPLETE
 * Three behaviours share one input:
 *
 *   typing  -> the catalog grid is re-filtered by a debounced navigation, so
 *              the results are already on screen if the visitor is looking at
 *              the grid (this is the pre-existing behaviour, unchanged);
 *   Escape / outside click -> the dropdown closes;
 *   Enter   -> the highlighted suggestion wins, otherwise the visitor is taken
 *              to the catalog grid and the viewport is moved to it.
 *
 * The Enter case needs the explicit scroll. The catalog lives at `/#katalog`,
 * under a full-height hero, and a client-side navigation that only changes the
 * query string does not reliably move the viewport - so without it the visitor
 * presses Enter, the URL changes, and they are still looking at the hero with
 * no visible sign that anything happened.
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

/** Debounce for the catalog re-filter navigation. */
const CATALOG_NAV_DEBOUNCE_MS = 300;

type SuggestionStatus = 'idle' | 'loading' | 'error';

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

  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [status, setStatus] = useState<SuggestionStatus>('idle');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const catalogNavTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const term = normalizeSearchTerm(value);

  /*
   * Derived, not stored: an empty or whitespace-only term hides the dropdown
   * without needing an effect to close it. Clearing the box therefore can never
   * leave a stale list on screen, however the value became empty.
   */
  const dropdownVisible = isOpen && shouldFetchSuggestions(term);

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

  // ─── Suggestions ────────────────────────────────────────────────────────────

  /*
   * The only effect that talks to the network. It is armed once per keystroke
   * and does nothing but schedule a debounced fetch, so it never sets state
   * during render or on the synchronous path - every state update below happens
   * after the request settles.
   *
   * Cleanup cancels the pending timer AND aborts the in-flight request, so a
   * response for a term the visitor has already typed past can never overwrite
   * the results of the term they are actually looking at.
   */
  useEffect(() => {
    if (!shouldFetchSuggestions(term)) return;

    const controller = new AbortController();

    const run = debounceAsync(async () => {
      try {
        const results = await fetchProductSuggestions(term, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setSuggestions(results);
        setStatus('idle');
      } catch {
        // An abort is the expected outcome of typing on, not a failure.
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setStatus('error');
      }
    }, SEARCH_SUGGEST_DEBOUNCE_MS);

    run.call();

    return () => {
      run.cancel();
      controller.abort();
    };
  }, [term]);

  // Close the dropdown when the pointer goes down outside the search box.
  // `pointerdown` rather than `click` so the close is not delayed behind a
  // click on some other control.
  useEffect(() => {
    if (!dropdownVisible) return;

    const handlePointerDown = (event: PointerEvent) => {
      const node = containerRef.current;
      if (!node) return;
      if (event.target instanceof Node && node.contains(event.target)) return;

      setIsOpen(false);
      setActiveIndex(-1);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () =>
      document.removeEventListener('pointerdown', handlePointerDown);
  }, [dropdownVisible]);

  // ─── Catalog navigation ─────────────────────────────────────────────────────

  const cancelPendingCatalogNav = useCallback(() => {
    if (catalogNavTimerRef.current !== undefined) {
      clearTimeout(catalogNavTimerRef.current);
      catalogNavTimerRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    // Already in sync — including right after the navigation we triggered, which
    // is what stops the debounce from looping on itself.
    if (value === query.search) return;

    const timer = setTimeout(() => {
      const href = buildCatalogHref(
        '/',
        { ...query, search: value, page: 1 },
        { scrollToCatalog: true }
      );

      // From the catalog, stay put so the header does not scroll away mid-typing.
      // From another page, land on the grid the search actually filters.
      if (pathname === '/') {
        router.replace(href, { scroll: false });
      } else {
        router.replace(href);
      }
    }, CATALOG_NAV_DEBOUNCE_MS);

    catalogNavTimerRef.current = timer;

    return () => {
      clearTimeout(timer);
      if (catalogNavTimerRef.current === timer) {
        catalogNavTimerRef.current = undefined;
      }
    };
  }, [value, query, pathname, router]);

  /**
   * Moves the viewport to the catalog grid.
   *
   * Two frames of delay because the first can still be the frame in which the
   * router is committing the new route; the anchor only exists once the catalog
   * section is in the document. If it is not there at all - the visitor is on a
   * page without a catalog - this is a no-op and Next's own hash handling takes
   * over.
   */
  const scrollToCatalog = useCallback(() => {
    const scroll = () => {
      const target = document.getElementById(CATALOG_ANCHOR);
      if (!target) return;

      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      target.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    };

    requestAnimationFrame(() => requestAnimationFrame(scroll));
  }, []);

  /** Opens the product page for a suggestion. */
  const goToProduct = useCallback(
    (slug: string) => {
      // Drop the pending catalog navigation first: without this the typing
      // debounce would fire a moment later and navigate a second time, undoing
      // the product the visitor just chose.
      cancelPendingCatalogNav();
      setIsOpen(false);
      setActiveIndex(-1);
      router.push(`/produk/${slug}`);
    },
    [cancelPendingCatalogNav, router]
  );

  /** Jumps to the catalog grid carrying the current term. */
  const goToCatalog = useCallback(
    (search: string) => {
      cancelPendingCatalogNav();
      setIsOpen(false);
      setActiveIndex(-1);

      router.push(
        buildCatalogHref(
          '/',
          { ...query, search, page: 1 },
          { scrollToCatalog: true }
        )
      );
      scrollToCatalog();
    },
    [cancelPendingCatalogNav, query, router, scrollToCatalog]
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setValue(next);
    setActiveIndex(-1);

    if (shouldFetchSuggestions(normalizeSearchTerm(next))) {
      setIsOpen(true);
      // Show the loading row for the whole debounce window, not only once the
      // request resolves - otherwise the dropdown appears already populated and
      // then visibly swaps in its rows.
      setStatus('loading');
    } else {
      setIsOpen(false);
      setSuggestions([]);
      setStatus('idle');
    }
  };

  const handleClear = () => {
    cancelPendingCatalogNav();
    setValue('');
    setSuggestions([]);
    setStatus('idle');
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        // Only meaningful while the list is on screen; otherwise let the key
        // move the caret as usual.
        if (!dropdownVisible) return;
        event.preventDefault();
        setActiveIndex((current) =>
          nextActiveIndex(current, 1, suggestions.length)
        );
        return;

      case 'ArrowUp':
        if (!dropdownVisible) return;
        event.preventDefault();
        setActiveIndex((current) =>
          nextActiveIndex(current, -1, suggestions.length)
        );
        return;

      case 'Escape':
        if (!dropdownVisible) return;
        event.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        return;

      case 'Enter': {
        /*
         * preventDefault unconditionally: this input is `type="search"`, and
         * letting Enter through would let the browser run its implicit form
         * submission on top of whichever branch below is taken - the "navigates
         * twice" failure this handler exists to prevent.
         */
        event.preventDefault();

        const action = resolveEnterAction({
          term,
          activeIndex: dropdownVisible ? activeIndex : -1,
          suggestions,
        });

        if (action.kind === 'product') goToProduct(action.slug);
        else if (action.kind === 'catalog') goToCatalog(action.term);
        else {
          setIsOpen(false);
          setActiveIndex(-1);
        }
        return;
      }

      default:
    }
  };

  const listboxId = `navbar-suggestions-${variant}`;
  const inputId = variant === 'desktop' ? 'navbar-search' : undefined;

  return (
    <div className="relative" ref={containerRef}>
      <Search
        size={15}
        strokeWidth={1.5}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#999999] pointer-events-none"
      />
      <input
        id={inputId}
        ref={inputRef}
        type="search"
        placeholder="Cari produk…"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (shouldFetchSuggestions(term)) setIsOpen(true);
        }}
        className={
          variant === 'desktop'
            ? 'w-full input-warm rounded-sm pl-10 pr-9 py-2.5 text-[13px] tracking-wide'
            : 'w-full input-warm rounded-sm pl-10 pr-4 py-2.5 text-[13px] tracking-wide'
        }
        autoFocus={variant === 'mobile'}
        aria-label="Cari produk"
        /*
         * Combobox pattern: the input owns the listbox, and the active option is
         * pointed at by id so a screen reader announces the highlighted row
         * without the focus ever leaving the text field.
         */
        role="combobox"
        aria-expanded={dropdownVisible}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          dropdownVisible && activeIndex >= 0
            ? `${listboxId}-option-${activeIndex}`
            : undefined
        }
        maxLength={MAX_SEARCH_QUERY_LENGTH}
      />
      {variant === 'desktop' && value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#1A1A1A] transition-colors"
          aria-label="Hapus pencarian"
        >
          <X size={13} strokeWidth={1.5} />
        </button>
      )}

      {/* ─── Autocomplete ─────────────────────────────────────────── */}
      {dropdownVisible && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Rekomendasi produk"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 bg-white border border-[#E5E1DA] shadow-[0_12px_32px_rgba(26,26,26,0.10)] animate-fade-down"
        >
          {status === 'loading' && (
            <p
              role="status"
              className="flex items-center gap-2 px-4 py-3.5 text-[12px] text-[#999999] font-light"
            >
              <Loader2
                size={13}
                strokeWidth={1.5}
                className="animate-spin shrink-0"
              />
              Memuat…
            </p>
          )}

          {status === 'error' && (
            <p
              role="status"
              className="px-4 py-3.5 text-[12px] text-[#C4553D] font-light"
            >
              Saran produk tidak dapat dimuat. Tekan Enter untuk mencari di
              katalog.
            </p>
          )}

          {status === 'idle' && suggestions.length === 0 && (
            <p
              role="status"
              className="px-4 py-3.5 text-[12px] text-[#999999] font-light"
            >
              Tidak ada produk untuk &ldquo;{term}&rdquo;.
            </p>
          )}

          {status === 'idle' && suggestions.length > 0 && (
            <ul className="max-h-80 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <li key={suggestion.slug} role="none">
                  <button
                    type="button"
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => goToProduct(suggestion.slug)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      index === activeIndex
                        ? 'bg-[#F3F1EE]'
                        : 'bg-white hover:bg-[#FBF9F6]'
                    }`}
                  >
                    {suggestion.imageUrl ? (
                      <Image
                        src={suggestion.imageUrl}
                        alt=""
                        width={40}
                        height={40}
                        className="w-10 h-10 object-cover border border-[#E5E1DA] shrink-0"
                      />
                    ) : (
                      /*
                       * Same reasoning as `primaryImage`: an absent photo gets a
                       * neutral block rather than a placeholder image, which
                       * would imply the piece had been photographed.
                       */
                      <span
                        aria-hidden="true"
                        className="w-10 h-10 border border-[#E5E1DA] bg-[#F3F1EE] shrink-0"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] text-[#1A1A1A] truncate">
                        {suggestion.title}
                      </span>
                      <span className="block text-[10px] uppercase tracking-[0.14em] text-[#999999] truncate">
                        {suggestion.category}
                      </span>
                    </span>
                    <span className="text-[12px] text-[#666666] shrink-0 tabular-nums">
                      {formatPrice(suggestion.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Hint row: makes the Enter behaviour discoverable. */}
          {status === 'idle' && suggestions.length > 0 && (
            <p className="border-t border-[#E5E1DA] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-[#999999]">
              Enter untuk semua hasil &middot; Esc
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Server-rendered stand-in for the search box, used as the Suspense fallback so
 * the header keeps its full height and its input is already in the initial HTML.
 * It is deliberately non-interactive: `readOnly` and no dropdown.
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