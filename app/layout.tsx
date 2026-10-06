import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { FilterProvider } from '@/context/FilterContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { getSiteSettings } from '@/lib/data/site';
import { getSiteOrigin } from '@/lib/site-url';
import { BRAND } from '@/lib/brand';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#FBF9F6',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: '%s',
  },
  description: BRAND.description,
  keywords: [
    'kerajinan marmer',
    'marmer handmade',
    'tempat tisu marmer',
    'vas marmer',
    'nampan marmer',
    'coaster marmer',
    'Studio Marmer',
  ],
  applicationName: BRAND.name,
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    type: 'website',
    locale: 'id_ID',
    siteName: BRAND.name,
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Root layout — Server Component.
 *
 * Site-wide configuration is read once here and passed down as plain props, so
 * the Navbar and Footer never touch the database themselves.
 *
 * Studio Marmer has no internal checkout, so no cart provider is mounted.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Site-wide configuration is read once here and passed down as plain props,
  // so the Navbar and Footer never touch the database themselves.
  const settings = await getSiteSettings();

  return (
    <html lang="id" className={inter.variable}>
      <body className="bg-[#FBF9F6] text-[#1A1A1A] font-[family-name:var(--font-inter)] antialiased min-h-screen flex flex-col">
        <FilterProvider>
          <Navbar settings={settings} />
          <main className="flex-1">{children}</main>
          <Footer settings={settings} />
        </FilterProvider>
      </body>
    </html>
  );
}
