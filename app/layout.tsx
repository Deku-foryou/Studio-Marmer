import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Studio Marmer — Kerajinan Marmer',
    template: '%s',
  },
  description:
    'Studio Marmer mengukir potongan marmer menjadi benda yang dipakai setiap hari, dengan menghormati karakter alami setiap batu.',
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
  openGraph: {
    title: 'Studio Marmer — Kerajinan Marmer',
    description:
      'Koleksi kerajinan marmer dengan karakter alami, dibuat untuk menghadirkan sentuhan elegan pada ruang Anda.',
    type: 'website',
    locale: 'id_ID',
    siteName: 'Studio Marmer',
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
