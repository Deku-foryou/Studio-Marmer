import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { siteOrigin } from '@/lib/site-url';
import './globals.css';

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
  metadataBase: new URL(siteOrigin()),
  title: {
    default: 'Studio Marmer | Produk Marmer Handmade',
    template: '%s | Studio Marmer',
  },
  description:
    'Studio Marmer menghadirkan kerajinan marmer handmade: tempat tisu, tempat sabun, holder, nampan, coaster, dan vas kecil. Lihat katalog dan hubungi kami via WhatsApp.',
  keywords: [
    'kerajinan marmer',
    'marmer handmade',
    'tempat tisu marmer',
    'vas marmer',
    'nampan marmer',
    'coaster marmer',
    'Studio Marmer',
  ],
  applicationName: 'Studio Marmer',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/images/sm-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/images/sm-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Studio Marmer | Produk Marmer Handmade',
    description:
      'Studio Marmer menghadirkan kerajinan marmer handmade: tempat tisu, tempat sabun, holder, nampan, coaster, dan vas kecil. Lihat katalog dan hubungi kami via WhatsApp.',
    type: 'website',
    locale: 'id_ID',
    siteName: 'Studio Marmer',
    images: [
      {
        url: '/images/hero-marble-vanity-1672.webp',
        alt: 'Studio Marmer - kerajinan marmer handmade',
      },
    ],
  },
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Root layout — the single <html>/<body> shell shared by every route.
 *
 * It intentionally renders nothing but `{children}`. Customer chrome
 * (Navbar, Footer, the catalog filter provider) lives in `app/(store)/layout.tsx`
 * and the admin chrome in `app/(admin)/admin/layout.tsx`, so the two areas stay
 * architecturally separate and neither inherits the other's state.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `data-scroll-behavior="smooth"` tells Next.js that the smooth scrolling in
    // globals.css is deliberate, so route transitions can opt out of it instead
    // of animating the viewport on every navigation. Declaring it here is what
    // silences Next's runtime warning while keeping the effect for in-page
    // anchors such as /#katalog.
    <html lang="id" className={inter.variable} data-scroll-behavior="smooth">
      <body className="bg-[#FBF9F6] text-[#1A1A1A] font-[family-name:var(--font-inter)] antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
