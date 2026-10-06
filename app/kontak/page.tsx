import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle, ShoppingBag, Mail, MapPin, Camera, Music2 } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { getSiteSettings } from '@/lib/data/site';
import { buildWhatsAppLink } from '@/lib/utils';

export const metadata: Metadata = {
  title: `Kontak — ${BRAND.name}`,
  description:
    'Hubungi Studio Marmer lewat WhatsApp, Shopee, atau email untuk menanyakan ketersediaan dan detail produk.',
  alternates: { canonical: '/kontak' },
};

/**
 * Contact page — Server Component.
 *
 * Only channels actually configured in `site_settings` are rendered, so the
 * page never shows a dead contact method while the client is still setting up
 * their accounts.
 */
export default async function ContactPage() {
  const settings = await getSiteSettings();

  const whatsappHref = buildWhatsAppLink(
    settings.whatsappNumber,
    'Halo Studio Marmer, saya ingin menanyakan produk yang tersedia.'
  );

  const hasAnyChannel =
    Boolean(whatsappHref) ||
    Boolean(settings.shopeeUrl) ||
    Boolean(settings.email) ||
    Boolean(settings.address) ||
    Boolean(settings.instagramUrl) ||
    Boolean(settings.tiktokUrl);

  return (
    <main className="bg-[#FBF9F6]">
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pt-16 sm:pt-24 pb-12 sm:pb-16">
        <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-3">
          Kontak
        </span>
        <h1 className="text-[clamp(2rem,4.5vw,3.4rem)] font-light leading-[1.12] tracking-tight text-[#1A1A1A] max-w-3xl">
          Mari bicara.
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed font-light max-w-xl mt-4">
          Untuk pertanyaan soal ukuran, jenis marmer, atau ketersediaan satu
          satuan, silakan hubungi kami. Ceritakan sedikit kebutuhan Anda agar
          kami bisa menyarankan karya yang paling sesuai.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pb-20 sm:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          {/* ─── Channels ─────────────────────────────────────────── */}
          <div className="lg:col-span-7">
            {hasAnyChannel ? (
              <ul className="space-y-px bg-[#E5E1DA] border border-[#E5E1DA]">
                {whatsappHref && (
                  <li>
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 bg-[#FBF9F6] px-5 sm:px-6 py-5 hover:bg-white transition-colors duration-300"
                    >
                      <span className="w-10 h-10 border border-[#E5E1DA] bg-white flex items-center justify-center flex-shrink-0">
                        <MessageCircle size={16} strokeWidth={1.5} className="text-[#8B7355]" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[11px] uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                          WhatsApp
                        </span>
                        <span className="block text-xs text-[#999999] mt-0.5">
                          Cara tercepat untuk menanyakan ketersediaan
                        </span>
                      </span>
                    </a>
                  </li>
                )}

                {settings.shopeeUrl && (
                  <li>
                    <a
                      href={settings.shopeeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 bg-[#FBF9F6] px-5 sm:px-6 py-5 hover:bg-white transition-colors duration-300"
                    >
                      <span className="w-10 h-10 border border-[#E5E1DA] bg-white flex items-center justify-center flex-shrink-0">
                        <ShoppingBag size={16} strokeWidth={1.5} className="text-[#8B7355]" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[11px] uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                          Shopee
                        </span>
                        <span className="block text-xs text-[#999999] mt-0.5">
                          Untuk pembelian dan cek status pengiriman
                        </span>
                      </span>
                    </a>
                  </li>
                )}

                {settings.email && (
                  <li>
                    <a
                      href={`mailto:${settings.email}`}
                      className="group flex items-center gap-4 bg-[#FBF9F6] px-5 sm:px-6 py-5 hover:bg-white transition-colors duration-300"
                    >
                      <span className="w-10 h-10 border border-[#E5E1DA] bg-white flex items-center justify-center flex-shrink-0">
                        <Mail size={16} strokeWidth={1.5} className="text-[#8B7355]" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[11px] uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                          Email
                        </span>
                        <span className="block text-xs text-[#999999] mt-0.5 break-all">
                          {settings.email}
                        </span>
                      </span>
                    </a>
                  </li>
                )}

                {settings.address && (
                  <li className="flex items-center gap-4 bg-[#FBF9F6] px-5 sm:px-6 py-5">
                    <span className="w-10 h-10 border border-[#E5E1DA] bg-white flex items-center justify-center flex-shrink-0">
                      <MapPin size={16} strokeWidth={1.5} className="text-[#8B7355]" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[11px] uppercase tracking-[0.16em] text-[#1A1A1A] font-medium">
                        Alamat
                      </span>
                      <span className="block text-xs text-[#999999] mt-0.5 leading-relaxed">
                        {settings.address}
                      </span>
                    </span>
                  </li>
                )}
              </ul>
            ) : (
              <div className="border border-[#E5E1DA] bg-white px-6 py-10 text-center">
                <p className="text-sm text-[#666666] font-light mb-1">
                  Informasi kontak belum dikonfigurasi.
                </p>
                <p className="text-xs text-[#999999] font-light">
                  Silakan kembali lagi nanti.
                </p>
              </div>
            )}
          </div>

          {/* ─── Social ───────────────────────────────────────────── */}
          <aside className="lg:col-span-5">
            <div className="border border-[#E5E1DA] bg-white p-6 sm:p-7">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-[#8B7355] font-medium mb-5">
                Ikuti kami
              </h2>

              {settings.instagramUrl || settings.tiktokUrl ? (
                <ul className="space-y-3">
                  {settings.instagramUrl && (
                    <li>
                      <a
                        href={settings.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 text-sm text-[#666666] hover:text-[#1A1A1A] transition-colors"
                      >
                        <Camera size={15} strokeWidth={1.5} />
                        Instagram
                      </a>
                    </li>
                  )}
                  {settings.tiktokUrl && (
                    <li>
                      <a
                        href={settings.tiktokUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 text-sm text-[#666666] hover:text-[#1A1A1A] transition-colors"
                      >
                        <Music2 size={15} strokeWidth={1.5} />
                        TikTok
                      </a>
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-xs text-[#999999] font-light leading-relaxed">
                  Tautan media sosial akan ditambahkan setelah akun resmi
                  dipublikasikan.
                </p>
              )}

              <div className="mt-6 pt-6 border-t border-[#E5E1DA]">
                <Link
                  href="/#katalog"
                  className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#666666] hover:text-[#1A1A1A] transition-colors"
                >
                  Lihat Katalog
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
