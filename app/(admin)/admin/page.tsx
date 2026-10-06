import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isAdminRole } from '@/auth.config';
import { Package, Layers, Settings2, ArrowUpRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dashboard',
};

/**
 * Admin dashboard — Server Component.
 *
 * Reads the session on the server via `auth()`. The `redirect` is defence in
 * depth: even if `proxy.ts` were bypassed, nothing renders without a session.
 */
export default async function AdminDashboardPage() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !isAdminRole(user.role)) {
    redirect('/admin/login');
  }

  /**
   * `available: true` modules link to a working route; the rest render as
   * non-interactive placeholders until their phase lands.
   */
  const modules = [
    {
      title: 'Produk',
      description: 'Kelola katalog produk marmer.',
      href: '/admin/produk',
      Icon: Package,
      available: true,
    },
    {
      title: 'Kategori',
      description: 'Atur kategori dan urutan tampilannya.',
      href: '/admin/produk',
      Icon: Layers,
      available: false,
    },
    {
      title: 'Pengaturan',
      description: 'Kontak WhatsApp, Shopee, dan media sosial.',
      href: '/admin/produk',
      Icon: Settings2,
      available: false,
    },
  ] as const;

  return (
    <main className="max-w-6xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
      <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-2">
        Dashboard
      </span>
      <h1 className="text-2xl sm:text-3xl font-light text-[#1A1A1A] tracking-tight mb-2">
        Halo, {user.name ?? 'Admin'}.
      </h1>
      <p className="text-sm text-[#666666] font-light max-w-lg">
        Kelola katalog produk marmer dari sini. Modul lain sedang disiapkan.
      </p>

      {/* ─── Identity ─────────────────────────────────────────────── */}
      <section
        aria-labelledby="sesi-heading"
        className="mt-8 border border-[#E5E1DA] bg-white px-6 py-5"
      >
        <h2
          id="sesi-heading"
          className="text-[10px] uppercase tracking-[0.18em] text-[#999999] font-medium mb-3"
        >
          Sesi saat ini
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'ID', value: user.id },
            { label: 'Email', value: user.email ?? '-' },
            { label: 'Peran', value: user.role },
          ].map((item) => (
            <div key={item.label}>
              <dt className="text-[9px] uppercase tracking-[0.16em] text-[#999999] mb-1">
                {item.label}
              </dt>
              <dd className="text-xs text-[#1A1A1A] font-light break-all">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ─── Modules ──────────────────────────────────────────────── */}
      <section aria-labelledby="modul-heading" className="mt-10">
        <h2
          id="modul-heading"
          className="text-[10px] uppercase tracking-[0.18em] text-[#999999] font-medium mb-4"
        >
          Modul
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {modules.map(({ title, description, href, Icon, available }) =>
            available ? (
              <Link
                key={title}
                href={href}
                className="group border border-[#E5E1DA] bg-white px-5 py-6 hover:border-[#1A1A1A] transition-colors duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon
                    size={16}
                    strokeWidth={1.5}
                    className="text-[#8B7355]"
                    aria-hidden="true"
                  />
                  <ArrowUpRight
                    size={13}
                    strokeWidth={1.5}
                    className="text-[#C9C4BC] group-hover:text-[#8B7355] transition-colors"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-[12px] uppercase tracking-[0.14em] text-[#1A1A1A] font-medium mb-1.5">
                  {title}
                </h3>
                <p className="text-xs text-[#666666] font-light leading-relaxed">
                  {description}
                </p>
              </Link>
            ) : (
              <div
                key={title}
                aria-disabled="true"
                className="border border-[#E5E1DA] bg-white px-5 py-6 opacity-60 cursor-not-allowed select-none"
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon
                    size={16}
                    strokeWidth={1.5}
                    className="text-[#8B7355]"
                    aria-hidden="true"
                  />
                  <span className="text-[9px] uppercase tracking-[0.16em] text-[#C9C4BC] font-medium">
                    Segera
                  </span>
                </div>
                <h3 className="text-[12px] uppercase tracking-[0.14em] text-[#1A1A1A] font-medium mb-1.5">
                  {title}
                </h3>
                <p className="text-xs text-[#666666] font-light leading-relaxed">
                  {description}
                </p>
              </div>
            )
          )}
        </div>
      </section>
    </main>
  );
}
