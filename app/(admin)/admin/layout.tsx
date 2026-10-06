import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/auth';
import { isAdminRole } from '@/auth.config';
import { redirect } from 'next/navigation';
import { signOutAction } from './actions';
import { LayoutDashboard, Package, Layers, Settings2, LogOut } from 'lucide-react';

export const metadata: Metadata = {
  title: {
    default: 'Studio Marmer Admin',
    template: '%s — Studio Marmer Admin',
  },
  description: 'Area internal Studio Marmer.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

/**
 * Admin area layout — Server Component.
 *
 * Owns the admin chrome: the Studio Marmer wordmark, the module navigation, the
 * signed-in identity and the logout control.
 *
 * Deliberately minimal: no storefront Navbar/Footer, no `FilterProvider`, no
 * catalog state, no `getSiteSettings()` read. The admin area is fully
 * independent of the customer site.
 *
 * Protection is enforced in `proxy.ts` (matcher `/admin/:path*`), which runs
 * before render. The session re-check below is defence in depth so the chrome
 * never renders for an unauthenticated request.
 */

/**
 * Admin navigation.
 * `disabled: true` marks modules that are placeholders for a later phase —
 * they render as non-interactive text rather than a link.
 */
const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', Icon: LayoutDashboard, disabled: false },
  { href: '/admin/produk', label: 'Produk', Icon: Package, disabled: false },
  { href: '/admin/kategori', label: 'Kategori', Icon: Layers, disabled: false },
  { href: '/admin/produk', label: 'Pengaturan', Icon: Settings2, disabled: true },
] as const;

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !isAdminRole(user.role)) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-[#F5F3F0] flex flex-col">
      {/* ─── Header ───────────────────────────────────────────────── */}
      <header className="border-b border-[#E5E1DA] bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="leading-none group" aria-label="Dashboard admin">
              <span className="block text-[13px] font-light tracking-[0.18em] uppercase text-[#1A1A1A]">
                Studio
              </span>
              <span className="block text-[13px] font-medium tracking-[0.18em] uppercase text-[#1A1A1A]">
                Marmer
              </span>
            </Link>

            <nav
              aria-label="Navigasi admin"
              className="hidden sm:flex items-center gap-1"
            >
              {NAV_ITEMS.map((item) => {
                const { label, href, Icon, disabled } = item;
                const classes =
                  'inline-flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors';

                if (disabled) {
                  return (
                    <span
                      key={label}
                      aria-disabled="true"
                      title="Segera hadir"
                      className={`${classes} text-[#C9C4BC] cursor-not-allowed select-none`}
                    >
                      <Icon size={13} strokeWidth={1.5} aria-hidden="true" />
                      {label}
                    </span>
                  );
                }

                return (
                  <Link
                    key={label}
                    href={href}
                    className={`${classes} text-[#666666] hover:text-[#1A1A1A]`}
                  >
                    <Icon size={13} strokeWidth={1.5} aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-[11px] font-medium text-[#1A1A1A] leading-tight">
                {user.name ?? 'Admin'}
              </p>
              <p className="text-[9px] uppercase tracking-[0.16em] text-[#8B7355] font-medium leading-tight">
                {user.role}
              </p>
            </div>

            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 border border-[#E5E1DA] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-colors duration-300 px-3 py-2 text-[10px] uppercase tracking-[0.14em] font-medium"
              >
                <LogOut size={12} strokeWidth={1.5} aria-hidden="true" />
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
