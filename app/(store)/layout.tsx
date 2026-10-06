import { FilterProvider } from '@/context/FilterContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { getSiteSettings } from '@/lib/data/site';

/**
 * Customer storefront layout — Server Component.
 *
 * Owns the storefront chrome and its client-side catalog state:
 *  - `FilterProvider` (search / category / sort) for the catalog UI
 *  - `Navbar` and `Footer`
 *  - the single `getSiteSettings()` read shared by both
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
    <FilterProvider>
      <Navbar settings={settings} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
    </FilterProvider>
  );
}
