'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFilter } from '@/context/FilterContext';
import { Search, X, Menu, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND, NAV_LINKS } from '@/lib/brand';
import type { SiteSettingsDTO } from '@/types/site';

interface NavbarProps {
  /** Passed from the root Server Component so the navbar stays a leaf client component. */
  settings: SiteSettingsDTO;
}

export default function Navbar({ settings }: NavbarProps) {
  const { filters, setSearchQuery } = useFilter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Debounce search so typing does not re-filter the catalog on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  // Keep the input in sync when the query is cleared elsewhere (for example by
  // the "Hapus Filter" button in FilterBar).
  //
  // This uses React's documented "adjusting state when a prop changes" pattern:
  // the comparison and both setState calls run during render, so React
  // re-renders immediately without ever committing an intermediate frame that
  // shows a stale value. Doing the same inside an effect causes a cascading
  // render, which is precisely what `react-hooks/set-state-in-effect` reports.
  const [lastSyncedQuery, setLastSyncedQuery] = useState(filters.searchQuery);

  if (filters.searchQuery !== lastSyncedQuery) {
    setLastSyncedQuery(filters.searchQuery);
    setLocalSearch(filters.searchQuery);
  }

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close the mobile menu whenever the viewport grows past the md breakpoint.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handle = () => {
      if (mq.matches) setIsMenuOpen(false);
    };
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  // Lock body scroll while the mobile menu overlay is open.
  useEffect(() => {
    if (!isMenuOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const whatsappHref = settings.whatsappNumber
    ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`
    : null;

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-500',
        'navbar-warm',
        isScrolled ? 'py-3' : 'py-4 sm:py-5'
      )}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between gap-4 lg:gap-8">
          {/* ─── Wordmark ─────────────────────────────────────────── */}
          <Link href="/" className="flex-shrink-0 group leading-none">
            <span className="block text-[15px] sm:text-[17px] font-light tracking-[0.18em] uppercase text-[#1A1A1A] select-none">
              {BRAND.nameTop}
            </span>
            <span className="block text-[15px] sm:text-[17px] font-medium tracking-[0.18em] uppercase text-[#1A1A1A] select-none">
              {BRAND.nameBottom}
            </span>
          </Link>

          {/* ─── Desktop nav links ─────────────────────────────────── */}
          <nav
            aria-label="Navigasi utama"
            className="hidden md:flex items-center gap-7 lg:gap-9"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[11px] uppercase tracking-[0.16em] text-[#666666] hover:text-[#1A1A1A] transition-colors duration-300 py-1 border-b border-transparent hover:border-[#1A1A1A]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* ─── Search (Desktop) ─────────────────────────────────── */}
          <div className="hidden lg:block flex-1 max-w-xs">
            <div className="relative">
              <Search
                size={15}
                strokeWidth={1.5}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#999999] pointer-events-none"
              />
              <input
                id="navbar-search"
                type="search"
                placeholder="Cari produk…"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full input-warm rounded-sm pl-10 pr-9 py-2.5 text-[13px] tracking-wide"
                aria-label="Cari produk"
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#1A1A1A] transition-colors"
                  aria-label="Hapus pencarian"
                >
                  <X size={13} strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>

          {/* ─── Actions ──────────────────────────────────────────── */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile search toggle */}
            <button
              onClick={() => setIsMobileSearchOpen((v) => !v)}
              className="lg:hidden p-2.5 text-[#666666] hover:text-[#1A1A1A] transition-colors"
              aria-label="Tampilkan pencarian"
              aria-expanded={isMobileSearchOpen}
            >
              <Search size={18} strokeWidth={1.5} />
            </button>

            {/* WhatsApp CTA */}
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] font-medium hover:bg-[#333333] transition-colors duration-300"
              >
                <MessageCircle size={13} strokeWidth={1.5} />
                WhatsApp
              </a>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMenuOpen((v) => !v)}
              className="md:hidden p-2.5 text-[#666666] hover:text-[#1A1A1A] transition-colors"
              aria-label={isMenuOpen ? 'Tutup menu' : 'Buka menu'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? (
                <X size={20} strokeWidth={1.5} />
              ) : (
                <Menu size={20} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {/* ─── Mobile search ─────────────────────────────────────── */}
        {isMobileSearchOpen && (
          <div className="lg:hidden mt-4 pb-1 animate-fade-down">
            <div className="relative">
              <Search
                size={15}
                strokeWidth={1.5}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#999999] pointer-events-none"
              />
              <input
                type="search"
                placeholder="Cari produk…"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full input-warm rounded-sm pl-10 pr-4 py-2.5 text-[13px] tracking-wide"
                autoFocus
                aria-label="Cari produk"
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Mobile navigation overlay ───────────────────────────── */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[57px] z-40 bg-[#FBF9F6] animate-fade-in">
          <nav
            aria-label="Navigasi seluler"
            className="h-full overflow-y-auto px-6 sm:px-8 py-8"
          >
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href} className="border-b border-[#E5E1DA]">
                  <Link
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="block py-4 text-sm uppercase tracking-[0.16em] text-[#1A1A1A]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 w-full inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-6 py-4 text-[11px] uppercase tracking-[0.16em] font-medium"
              >
                <MessageCircle size={14} strokeWidth={1.5} />
                Pesan via WhatsApp
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
