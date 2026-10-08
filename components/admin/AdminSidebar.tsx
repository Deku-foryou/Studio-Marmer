'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Layers,
  Settings2,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { signOutAction } from '@/app/(admin)/admin/actions';
import { cn } from '@/lib/utils';

/**
 * Admin sidebar — Client Component.
 *
 * Owns the admin shell's navigation: module links, the signed-in identity and
 * the logout control. It is the single place any admin page sees the sidebar —
 * `app/(admin)/admin/(dashboard)/layout.tsx` renders it once, so a route can
 * never drift into a second copy or a different menu.
 *
 * WHY THE ACTIVE STATE NEEDS THE CLIENT
 * `usePathname` is how "which module am I in" is known. Passing the active item
 * down from the server would still require the server to read the pathname on
 * every navigation, and the drawer toggle is client state regardless, so the
 * whole shell lives here.
 *
 * ACTIVE MATCHING
 * A module is active on its own index (`/admin/produk`) and on everything
 * beneath it (`/admin/produk/tambah`, `/admin/produk/12/edit`). A plain equality
 * test would leave deep pages with no highlighted item at all.
 *
 * Responsive: a fixed rail from `lg` up, and an off-canvas drawer below it.
 */

interface AdminSidebarProps {
  userName: string;
  userRole: string;
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/admin/produk', label: 'Produk', Icon: Package },
  { href: '/admin/kategori', label: 'Kategori', Icon: Layers },
  { href: '/admin/pengaturan', label: 'Pengaturan', Icon: Settings2 },
] as const;

/**
 * True when `pathname` is the module at `href` or lives beneath it.
 * `/admin` must not light up for `/admin/produk`, hence the boundary check.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar({ userName, userRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Any navigation closes the drawer, otherwise it stays open on top of the page
  // the visitor just opened.
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Escape closes the drawer, and the page behind it must not scroll while the
  // drawer is open.
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  /**
   * Rendered into both the desktop rail and the mobile drawer. The two are the
   * same navigation at different breakpoints, so they carry distinct landmark
   * labels — a screen reader should never meet two identically named `nav`
   * landmarks for the same links.
   */
  const nav = (variant: 'rail' | 'drawer') => (
    <>
      {/* ─── Wordmark ──────────────────────────────────────────────── */}
      <Link
        href="/admin"
        className="block px-6 py-6 border-b border-[#2E2E2E] shrink-0"
        aria-label="Dashboard admin"
      >
        <span className="block text-[13px] font-light tracking-[0.18em] uppercase text-[#F5F3F0] leading-tight">
          Studio
        </span>
        <span className="block text-[13px] font-medium tracking-[0.18em] uppercase text-[#F5F3F0] leading-tight">
          Marmer
        </span>
      </Link>

      {/* ─── Modules ───────────────────────────────────────────────── */}
      <nav
        aria-label={
          variant === 'rail'
            ? 'Navigasi admin'
            : 'Navigasi admin seluler'
        }
        className="flex-1 overflow-y-auto py-4"
      >
        <ul className="px-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);

            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    // A charcoal block with a bright left rule marks the active
                    // module; the border keeps it legible without adding colour
                    // that would fight the marble palette.
                    'flex items-center gap-3 px-3 py-2.5 border-l-2 text-[11px] uppercase tracking-[0.14em] transition-colors duration-300',
                    active
                      ? 'border-[#8B7355] bg-[#232323] text-[#F5F3F0]'
                      : 'border-transparent text-[#A3A09B] hover:bg-[#1F1F1F] hover:text-[#F5F3F0]'
                  )}
                >
                  <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ─── Identity + logout ─────────────────────────────────────── */}
      <div className="border-t border-[#2E2E2E] px-6 py-5 shrink-0">
        <p className="text-[11px] font-medium text-[#F5F3F0] leading-tight truncate">
          {userName}
        </p>
        <p className="text-[9px] uppercase tracking-[0.16em] text-[#8B7355] font-medium leading-tight mt-0.5">
          {userRole}
        </p>

        <form action={signOutAction} className="mt-4">
          <button
            type="submit"
            className="inline-flex items-center gap-2 border border-[#2E2E2E] px-3 py-2 text-[10px] uppercase tracking-[0.14em] font-medium text-[#A3A09B] hover:bg-[#F5F3F0] hover:text-[#1A1A1A] hover:border-[#F5F3F0] transition-colors duration-300 w-full justify-center"
          >
            <LogOut size={12} strokeWidth={1.5} aria-hidden="true" />
            Keluar
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* ─── Mobile top bar (the rail is hidden below lg) ─────────────── */}
      <div className="lg:hidden sticky top-0 z-40 border-b border-[#2E2E2E] bg-[#171717] flex items-center justify-between px-4 py-3">
        <span className="text-[12px] tracking-[0.18em] uppercase text-[#F5F3F0] leading-tight">
          Studio Marmer
        </span>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={isOpen ? 'Tutup navigasi' : 'Buka navigasi'}
          aria-expanded={isOpen}
          aria-controls="admin-sidebar-drawer"
          className="p-2 -mr-2 text-[#A3A09B] hover:text-[#F5F3F0] transition-colors"
        >
          {isOpen ? (
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Menu size={18} strokeWidth={1.5} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Backdrop. Rendered only while open, and never on desktop where the
          rail is always present. */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 top-[49px] z-40 bg-[#1A1A1A]/40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── Desktop rail ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 z-50 flex-col bg-[#171717] border-r border-[#2E2E2E]">
        {nav('rail')}
      </aside>

      {/* ─── Mobile drawer ────────────────────────────────────────────── */}
      <aside
        id="admin-sidebar-drawer"
        aria-label="Navigasi admin"
        aria-hidden={!isOpen}
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] flex-col',
          'bg-[#171717] border-r border-[#2E2E2E]',
          // Kept mounted so the slide transition can run; moved off-canvas and
          // made inert rather than unmounted.
          isOpen
            ? 'translate-x-0 transition-transform duration-300 ease-out'
            : '-translate-x-full transition-transform duration-300 ease-out'
        )}
      >
        {nav('drawer')}
      </aside>
    </>
  );
}