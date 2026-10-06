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
  title: 'NEXUS — Premium Tech Store | NST HeadStart 2026',
  description:
    'Discover the world\'s most exclusive tech gadgets. Audiophile headphones, AI laptops, smart rings, and pro cameras at NEXUS — the luxury tech destination.',
  keywords: [
    'premium tech',
    'luxury gadgets',
    'headphones',
    'laptops',
    'smart ring',
    'MacBook',
    'gaming',
    'NEXUS store',
  ],
  authors: [{ name: 'Piyush', url: 'https://nexus.store' }],
  creator: 'Piyush',
  openGraph: {
    title: 'NEXUS — Premium Tech Store',
    description: 'The luxury tech destination. Shop audiophile audio, AI laptops, smart rings, and more.',
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
