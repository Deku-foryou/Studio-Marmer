'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import NavbarSearch, { NavbarSearchSkeleton } from './NavbarSearch';
import { Search, X, Menu, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND, NAV_LINKS } from '@/lib/brand';
import type { SiteSettingsDTO } from '@/types/site';

interface NavbarProps {
  /** Passed from the root Server Component so the navbar stays a leaf client component. */
  settings: SiteSettingsDTO;
}

export default function Navbar({ settings }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
          {/* useSearchParams needs a Suspense boundary during prerender, so the
              interactive box is scoped to its own boundary instead of blanking
              the whole header. */}
          <div className="hidden lg:block flex-1 max-w-xs">
            <Suspense fallback={<NavbarSearchSkeleton variant="desktop" />}>
              <NavbarSearch variant="desktop" />
            </Suspense>
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
            <Suspense fallback={<NavbarSearchSkeleton variant="mobile" />}>
              <NavbarSearch variant="mobile" />
            </Suspense>
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
