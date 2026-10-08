import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';
import type { SiteSettingsDTO } from '@/types/site';

/**
 * Storefront hero — Server Component.
 *
 * The photograph is a plain CSS background on a full-bleed layer rather than an
 * `<Image>` inside the layout, so the image is cropped by `cover` and never
 * participates in page flow. Pre-generated WebP renditions are selected in CSS,
 * which keeps the download to ~95 KB on desktop and ~52 KB on phones instead of
 * the 2.2 MB source PNG, with no runtime image component and no client-side
 * JavaScript.
 *
 * Two veil layers sit above it: a horizontal one that keeps the left column
 * readable, and a short top fade that lets the sticky navbar melt into the
 * photograph. Both are warm off-white at low alpha — the image is never
 * darkened.
 *
 * There is deliberately no `<link rel="preload">` here. React emits such a link
 * twice in the streamed HTML, and because the source is chosen by a media query
 * the preload could only ever be a guess. The stylesheet is render-blocking, so
 * the request starts a few kilobytes into the CSS download regardless.
 *
 * `settings.heroTitle` / `settings.heroSubtitle` still override the copy when
 * the admin has filled them in, so this screen stays editable from /admin/pengaturan.
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
      className="relative isolate flex items-center overflow-hidden bg-[#FBF9F6] min-h-[540px] sm:min-h-[640px] lg:min-h-[720px]"
      aria-label="Studio Marmer"
    >
        {/* ─── Background photograph ──────────────────────────────── */}
        <div className="hero-backdrop absolute inset-0 -z-10" aria-hidden="true" />

        {/* Veil: softens the left column for legibility and fades the top edge
            into the sticky navbar. Warm off-white, never a dark scrim. */}
        <div className="hero-veil absolute inset-0 -z-10" aria-hidden="true" />

        {/* Carries the photograph into the cream section below. */}
        <div className="hero-foot absolute inset-x-0 bottom-0 h-40 -z-10" aria-hidden="true" />

        {/* ─── Content ─────────────────────────────────────────────── */}
        <div className="relative w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pt-14 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-28">
          <div className="max-w-xl lg:max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#8B7355] font-medium mb-6 animate-fade-up">
              Kerajinan Marmer
            </p>

            <h1 className="text-[clamp(2rem,5.5vw,4.2rem)] font-light leading-[1.12] tracking-tight text-[#1A1A1A] mb-6 animate-fade-up">
              {headline ?? (
                <>
                  Keindahan Marmer
                  <br />
                  <span className="font-medium">Dibentuk untuk Setiap Ruang.</span>
                </>
              )}
            </h1>

            {/*
              The description darkens on phones only. There it sits directly on
              the photograph, and #666666 needs a near-white backdrop for 4.5:1,
              which is exactly the backdrop the photo must not provide. #3A3A3A
              reaches the same ratio over a mid-tone stone, so the picture can
              stay visible behind the copy. Measured on the rendered page at
              320 / 375 / 393px.
            */}
            <p className="text-base sm:text-lg text-[#3A3A3A] sm:text-[#666666] leading-relaxed max-w-md mb-10 font-light animate-fade-up">
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

        {/* ─── Hairline separator ──────────────────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 z-10">
          <div className="h-px bg-[#E5E1DA]" />
        </div>
    </section>
  );
}