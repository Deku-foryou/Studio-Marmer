import Link from 'next/link';
import { Metadata } from 'next';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import type { SiteSettingsDTO } from '@/types/site';

function getDefaultSiteSettings(): SiteSettingsDTO {
  return {
    siteName: 'Studio Marmer',
    logoUrl: null,
    whatsappNumber: null,
    shopeeUrl: null,
    instagramUrl: null,
    tiktokUrl: null,
    email: null,
    address: null,
    heroTitle: null,
    heroSubtitle: null,
    heroImageUrl: null,
  };
}

export default function NotFoundPage() {
  const settings = getDefaultSiteSettings();
  return (
    <main>
      <h1>Halaman Tidak Ditemukan</h1>

      <Navbar settings={settings} />

      <section>
        <p>Maaf, halaman yang Anda cari tidak ditemukan.</p>

        <nav>
          <Link href="/">Kembali ke beranda</Link>
          <Link href="/produk">Lihat produk</Link>
        </nav>
      </section>

      <Footer settings={settings} />
    </main>
  );
}

export const metadata: Metadata = {
  title: 'Halaman Tidak Ditemukan — Studio Marmer',
  description: 'Halaman yang Anda cari tidak tersedia.',
  robots: {
    index: false,
    follow: false,
  },
};