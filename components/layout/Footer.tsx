import Link from 'next/link';
import { MessageCircle, ShoppingBag, Camera, Music2, Mail, MapPin } from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/utils';
import { BRAND } from '@/lib/brand';
import type { SiteSettingsDTO } from '@/types/site';

/**
 * Site footer — Server Component.
 *
 * Internal links point at real routes (never `href="#"`). External channels
 * are rendered only when configured in `site_settings`, so the footer degrades
 * gracefully while the client finishes setting up their accounts.
 */

interface FooterProps {
  settings: SiteSettingsDTO;
}

export default function Footer({ settings }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const whatsappHref = buildWhatsAppLink(
    settings.whatsappNumber,
    'Halo Studio Marmer, saya ingin menanyakan produk yang tersedia.'
  );

  const socialLinks = [
    settings.instagramUrl
      ? { href: settings.instagramUrl, label: 'Instagram', Icon: Camera }
      : null,
    settings.tiktokUrl
      ? { href: settings.tiktokUrl, label: 'TikTok', Icon: Music2 }
      : null,
  ].filter(
    (item): item is { href: string; label: string; Icon: typeof Camera } =>
      item !== null
  );

  return (
    <footer className="border-t border-[#E5E1DA] mt-16 sm:mt-24">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-14 sm:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-14">
          {/* ─── Brand ────────────────────────────────────────────── */}
          <div className="sm:col-span-2 lg:col-span-1">
            <span className="block text-[16px] font-light tracking-[0.18em] uppercase text-[#1A1A1A] leading-tight">
              {BRAND.nameTop}
            </span>
            <span className="block text-[16px] font-medium tracking-[0.18em] uppercase text-[#1A1A1A] leading-tight">
              {BRAND.nameBottom}
            </span>
            <p className="text-[12px] text-[#999999] leading-relaxed mt-4 max-w-[260px]">
              {BRAND.description}
            </p>
          </div>

          {/* ─── Navigate ─────────────────────────────────────────── */}
          <nav aria-label="Navigasi footer">
            <h2 className="text-[10px] font-medium text-[#1A1A1A] uppercase tracking-[0.2em] mb-5">
              Jelajahi
            </h2>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/#katalog"
                  className="text-[12px] text-[#666666] hover:text-[#1A1A1A] transition-colors duration-300"
                >
                  Katalog
                </Link>
              </li>
              <li>
                <Link
                  href="/tentang-kami"
                  className="text-[12px] text-[#666666] hover:text-[#1A1A1A] transition-colors duration-300"
                >
                  Tentang Kami
                </Link>
              </li>
              <li>
                <Link
                  href="/galeri"
                  className="text-[12px] text-[#666666] hover:text-[#1A1A1A] transition-colors duration-300"
                >
                  Galeri
                </Link>
              </li>
              <li>
                <Link
                  href="/kontak"
                  className="text-[12px] text-[#666666] hover:text-[#1A1A1A] transition-colors duration-300"
                >
                  Kontak
                </Link>
              </li>
            </ul>
          </nav>

          {/* ─── Beli / Hubungi ───────────────────────────────────── */}
          <div>
            <h2 className="text-[10px] font-medium text-[#1A1A1A] uppercase tracking-[0.2em] mb-5">
              Pembelian
            </h2>
            <ul className="space-y-3">
              {whatsappHref && (
                <li>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[12px] text-[#666666] hover:text-[#1A1A1A] transition-colors duration-300"
                  >
                    <MessageCircle size={13} strokeWidth={1.5} />
                    WhatsApp
                  </a>
                </li>
              )}
              {settings.shopeeUrl && (
                <li>
                  <a
                    href={settings.shopeeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[12px] text-[#666666] hover:text-[#1A1A1A] transition-colors duration-300"
                  >
                    <ShoppingBag size={13} strokeWidth={1.5} />
                    Shopee
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* ─── Social + contact details ──────────────────────────── */}
          <div>
            <h2 className="text-[10px] font-medium text-[#1A1A1A] uppercase tracking-[0.2em] mb-5">
              Ikuti &amp; Hubungi
            </h2>

            {socialLinks.length > 0 && (
              <ul className="space-y-3 mb-6">
                {socialLinks.map(({ href, label, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[12px] text-[#666666] hover:text-[#1A1A1A] transition-colors duration-300"
                    >
                      <Icon size={13} strokeWidth={1.5} />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <ul className="space-y-3">
              {settings.email && (
                <li>
                  <a
                    href={`mailto:${settings.email}`}
                    className="inline-flex items-start gap-2 text-[12px] text-[#666666] hover:text-[#1A1A1A] transition-colors duration-300 break-all"
                  >
                    <Mail size={13} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
                    {settings.email}
                  </a>
                </li>
              )}
              {settings.address && (
                <li className="flex items-start gap-2 text-[12px] text-[#666666] leading-relaxed">
                  <MapPin size={13} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
                  {settings.address}
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* ─── Bottom bar ─────────────────────────────────────────── */}
        <div className="mt-12 pt-6 border-t border-[#E5E1DA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[11px] text-[#C9C4BC] tracking-wide">
            © {currentYear} {BRAND.name}. Seluruh hak cipta dilindungi.
          </p>
          <p className="text-[11px] text-[#C9C4BC] tracking-wide">
            Pembelian diproses melalui Shopee
          </p>
        </div>
      </div>
    </footer>
  );
}
