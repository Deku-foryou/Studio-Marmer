import Link from 'next/link';
import { MessageCircle, ShoppingBag, Camera, Music2, Mail, MapPin } from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/utils';
import { BRAND } from '@/lib/brand';
import SiteLogo from './SiteLogo';
import type { SiteSettingsDTO } from '@/types/site';

/**
 * Site footer — Server Component.
 *
 * Internal links point at real routes (never `href="#"`). External channels
 * are rendered only when configured in `site_settings`, so the footer degrades
 * gracefully while the client finishes setting up their accounts.
 *
 * DARK THEME
 * The footer is the storefront's closing statement, so it inverts to charcoal
 * (#171717 - deliberately not #000000, which reads as a hole rather than a
 * surface). Structure, spacing, links and the column layout are untouched; only
 * the colour tokens changed. Measured contrast on #171717:
 *   wordmark / headings  #F5F3F0 -> 16.2:1
 *   links / description #A3A09B ->  7.1:1
 *   copyright            #8A8681 ->  4.9:1  (AA at 11px)
 *   hairline             #2E2E2E ->  1.4:1  (presentational only)
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
    <footer className="bg-[#171717] border-t border-[#2E2E2E] mt-16 sm:mt-24">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-14 sm:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-14">
          {/* ─── Brand ────────────────────────────────────────────── */}
          {/* An uploaded logo replaces the wordmark. The footer inverts to
              charcoal, so the logo needs a light plate behind it to stay legible
              if the uploaded mark is dark-on-transparent — without one, a dark
              logo would disappear into #171717. */}
          <div className="sm:col-span-2 lg:col-span-1">
            {settings.logoUrl?.trim() ? (
              <div className="inline-flex items-center bg-[#F5F3F0] px-3 py-2">
                <SiteLogo
                  logoUrl={settings.logoUrl}
                  siteName={BRAND.name}
                  className="h-9 w-auto object-contain"
                />
              </div>
            ) : (
              <>
                <span className="block text-[16px] font-light tracking-[0.18em] uppercase text-[#F5F3F0] leading-tight">
                  {BRAND.nameTop}
                </span>
                <span className="block text-[16px] font-medium tracking-[0.18em] uppercase text-[#F5F3F0] leading-tight">
                  {BRAND.nameBottom}
                </span>
              </>
            )}
            <p className="text-[12px] text-[#A3A09B] leading-relaxed mt-4 max-w-[260px]">
              {BRAND.description}
            </p>
          </div>

          {/* ─── Navigate ─────────────────────────────────────────── */}
          <nav aria-label="Navigasi footer">
            <h2 className="text-[10px] font-medium text-[#F5F3F0] uppercase tracking-[0.2em] mb-5">
              Jelajahi
            </h2>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/#katalog"
                  className="text-[12px] text-[#A3A09B] hover:text-[#FFFFFF] transition-colors duration-300"
                >
                  Katalog
                </Link>
              </li>
              <li>
                <Link
                  href="/tentang-kami"
                  className="text-[12px] text-[#A3A09B] hover:text-[#FFFFFF] transition-colors duration-300"
                >
                  Tentang Kami
                </Link>
              </li>
              <li>
                <Link
                  href="/galeri"
                  className="text-[12px] text-[#A3A09B] hover:text-[#FFFFFF] transition-colors duration-300"
                >
                  Galeri
                </Link>
              </li>
              <li>
                <Link
                  href="/kontak"
                  className="text-[12px] text-[#A3A09B] hover:text-[#FFFFFF] transition-colors duration-300"
                >
                  Kontak
                </Link>
              </li>
            </ul>
          </nav>

          {/* ─── Beli / Hubungi ───────────────────────────────────── */}
          <div>
            <h2 className="text-[10px] font-medium text-[#F5F3F0] uppercase tracking-[0.2em] mb-5">
              Pembelian
            </h2>
            <ul className="space-y-3">
              {whatsappHref && (
                <li>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[12px] text-[#A3A09B] hover:text-[#FFFFFF] transition-colors duration-300"
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
                    className="inline-flex items-center gap-2 text-[12px] text-[#A3A09B] hover:text-[#FFFFFF] transition-colors duration-300"
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
            <h2 className="text-[10px] font-medium text-[#F5F3F0] uppercase tracking-[0.2em] mb-5">
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
                      className="inline-flex items-center gap-2 text-[12px] text-[#A3A09B] hover:text-[#FFFFFF] transition-colors duration-300"
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
                    className="inline-flex items-start gap-2 text-[12px] text-[#A3A09B] hover:text-[#FFFFFF] transition-colors duration-300 break-all"
                  >
                    <Mail size={13} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
                    {settings.email}
                  </a>
                </li>
              )}
              {settings.address && (
                <li className="flex items-start gap-2 text-[12px] text-[#A3A09B] leading-relaxed">
                  <MapPin size={13} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
                  {settings.address}
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* ─── Bottom bar ─────────────────────────────────────────── */}
        <div className="mt-12 pt-6 border-t border-[#2E2E2E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[11px] text-[#8A8681] tracking-wide">
            © {currentYear} {BRAND.name}. Seluruh hak cipta dilindungi.
          </p>
          {/* A "Pembelian diproses melalui Shopee" note used to sit here. It was
              removed because `SiteSettings.shopeeUrl` is still null, so the
              Shopee link above never renders and the claim contradicts the
              footer. The `shopeeUrl` field and its conditional link are kept -
              restore the note when the client's storefront URL is in place. */}
        </div>
      </div>
    </footer>
  );
}
