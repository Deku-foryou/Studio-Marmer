import type { Metadata } from 'next';
import { auth } from '@/auth';
import { isAdminRole } from '@/auth.config';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';

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
 * Owns the admin shell: a fixed left sidebar (module navigation, session
 * identity, logout) and the content column to its right. `AdminSidebar` is
 * rendered exactly once here, so Dashboard, Produk, Kategori, Pengaturan and
 * every add/edit screen all inherit the same navigation without any page having
 * to declare it.
 *
 * Deliberately minimal: no storefront Navbar/Footer, no `FilterProvider`, no
 * catalog state, no `getSiteSettings()` read. The admin area is fully
 * independent of the customer site.
 *
 * Protection is enforced in `proxy.ts` (matcher `/admin/:path*`), which runs
 * before render. The session re-check below is defence in depth so the chrome
 * never renders for an unauthenticated request.
 *
 * LAYOUT
 * The rail is `fixed`, so the content column carries `lg:pl-60` to reserve its
 * width instead of a flex sibling — that is what keeps the rail in place while a
 * long table or form scrolls, and guarantees content never sits underneath it.
 */
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
    <div className="min-h-screen bg-[#F5F3F0]">
      <AdminSidebar
        userName={user.name ?? 'Admin'}
        userRole={user.role}
      />

      {/* `lg:pl-60` matches the rail width. `min-w-0` lets wide tables shrink
          and scroll inside this column instead of pushing the page sideways. */}
      <div className="lg:pl-60 min-w-0">
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}