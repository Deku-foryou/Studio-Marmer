import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MessageCircle } from 'lucide-react';
import type { SiteSettingsDTO } from '@/types/site';

/**
 * Server Component - no cart interaction is required here, so the hero does
 * not need to be a Client Component. This keeps it out of the client bundle.
 */

interface HeroSectionProps {
  settings: SiteSettingsDTO;
}

export default function HeroSection({ settings }: HeroSectionProps) {
  const headline = settings.heroTitle?.trim();
  const subline = settings.heroSubtitle?.trim();
  const whatsappHref = settings.whatsappNumber
    ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`
    : null;

  return (
    <section
      className="relative min-h-[520px] sm:min-h-[640px] flex items-center overflow-hidden bg-[#FBF9F6]"
      aria-label="Studio Marmer"
    >
      {/* ─── Background image ──────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/placeholders/studio-marmer-hero.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Warm gradient keeps the headline legible over any photograph. */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FBF9F6] via-[#FBF9F6]/80 to-[#FBF9F6]/20 md:via-[#FBF9F6]/55" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[#FBF9F6] pointer-events-none" />
      </div>

      {/* ─── Content ───────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pt-16 sm:pt-24 pb-16 sm:pb-24 w-full">
        <div className="max-w-2xl">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#8B7355] font-medium mb-6 animate-fade-up">
            Kerajinan Marmer
          </p>

          <h1 className="text-[clamp(2rem,5.5vw,4.2rem)] font-light leading-[1.1] tracking-tight text-[#1A1A1A] mb-6 animate-fade-up">
            {headline ?? (
              <>
                Keindahan Marmer,
                <br />
                <span className="font-medium">Dibentuk untuk Setiap Ruang.</span>
              </>
            )}
          </h1>

          <p className="text-base sm:text-lg text-[#666666] leading-relaxed max-w-xl mb-10 font-light animate-fade-up">
            {subline ??
              'Temukan koleksi kerajinan marmer dengan karakter alami, dibuat untuk menghadirkan sentuhan elegan pada ruang Anda.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-fade-up">
            <Link
              href="/#katalog"
              className="bg-[#1A1A1A] text-white hover:bg-[#333333] transition-all duration-300 inline-flex items-center justify-center gap-3 px-7 sm:px-8 py-3.5 text-[11px] uppercase tracking-[0.16em] font-medium"
            >
              Lihat Koleksi
              <ArrowRight size={14} strokeWidth={1.5} />
            </Link>

            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-[#D8D0C4] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-all duration-300 inline-flex items-center justify-center gap-3 px-7 sm:px-8 py-3.5 text-[11px] uppercase tracking-[0.16em] font-medium"
              >
                <MessageCircle size={14} strokeWidth={1.5} />
                Hubungi Kami
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ─── Hairline separator ────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 z-10">
        <div className="h-px bg-[#E5E1DA]" />
      </div>
    </section>
  );
}
