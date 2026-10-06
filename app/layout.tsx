import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { FilterProvider } from '@/context/FilterContext';
import Navbar from '../components/layout/Navbar';
import CartDrawer from '../components/layout/CartDrawer';
import Footer from '../components/layout/Footer';

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
  title: 'STORE',
  description:
    'A curated collection of considered pieces, selected for material integrity and aesthetic form.',
  keywords: [
    'curated collection',
    'craftsmanship',
    'minimal design',
  ],
  openGraph: {
    title: 'STORE',
    description: 'A curated collection of considered pieces.',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#FBF9F6] text-[#1A1A1A] font-[family-name:var(--font-inter)] antialiased min-h-screen flex flex-col">
        <CartProvider>
          <FilterProvider>
            <Navbar />
            <CartDrawer />
            <main className="flex-1">{children}</main>
            <Footer />
          </FilterProvider>
        </CartProvider>
      </body>
    </html>
  );
}
