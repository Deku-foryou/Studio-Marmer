import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/utils';
import type { SiteSettingsDTO } from '@/types/site';

/**
 * Closing WhatsApp call-to-action — Server Component.
 * Renders nothing when no WhatsApp number is configured, so the page never
 * shows a dead conversion button.
 */

interface WhatsAppCtaProps {
  settings: SiteSettingsDTO;
}

export default function WhatsAppCta({ settings }: WhatsAppCtaProps) {
  const href = buildWhatsAppLink(
    settings.whatsappNumber,
    'Halo Studio Marmer, saya ingin menanyakan produk yang tersedia.'
  );

  if (!href) return null;

  return (
    <section
      aria-labelledby="cta-heading"
      className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pb-20 sm:pb-28"
    >
      <div className="border border-[#E5E1DA] bg-white px-6 sm:px-12 py-12 sm:py-16 text-center">
        <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-3">
          Pertanyaan Produk
        </span>
        <h2
          id="cta-heading"
          className="text-2xl sm:text-3xl font-light text-[#1A1A1A] tracking-tight max-w-2xl mx-auto mb-4"
        >
          Ingin tahu ukuran atau ketersediaan produk?
        </h2>
        <p className="text-sm text-[#666666] leading-relaxed max-w-lg mx-auto font-light mb-8">
          Tanyakan langsung melalui WhatsApp. Kami akan membantu menjelaskan
          detail produk dan pilihan yang tersedia.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#1A1A1A] text-white px-8 py-4 text-[11px] uppercase tracking-[0.16em] font-medium hover:bg-[#333333] transition-colors duration-300"
          >
            <MessageCircle size={14} strokeWidth={1.5} />
            Tanya via WhatsApp
          </a>
          <Link
            href="/kontak"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 border border-[#D8D0C4] text-[#1A1A1A] px-8 py-4 text-[11px] uppercase tracking-[0.16em] font-medium hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-colors duration-300"
          >
            Halaman Kontak
          </Link>
        </div>
      </div>
    </section>
  );
}
