import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { getSiteSettings } from '@/lib/data/site';

/**
 * Customer storefront layout — Server Component.
 *
 * Owns the storefront chrome:
 *  - `Navbar` and `Footer`
 *  - the single `getSiteSettings()` read shared by both
 *
 * Catalog filter/pagination state is NOT here: it is scoped to the catalog
 * section in `app/(store)/page.tsx`, which is the only route that reads catalog
 * search params. Keeping the provider next to its consumer means the other
 * storefront pages never mount catalog state they do not use.
 *
 * The admin area has its own layout and deliberately does not inherit any of
 * this.
 */
export default async function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  return (
    <>
      <Navbar settings={settings} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
    </>
  );
}
