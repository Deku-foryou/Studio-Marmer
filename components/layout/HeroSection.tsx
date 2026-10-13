import Link from 'next/link';
import { getImageProps } from 'next/image';
import { ArrowRight, MessageCircle } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { SiteSettingsDTO } from '@/types/site';

/**
 * Storefront hero — Server Component.
 *
 * The photograph is a CSS background on a full-bleed layer rather than an
 * `<Image>` inside the layout, so `background-size: cover` does the cropping and
 * nothing hydrates to render it. That stays the right call: the design leans on
 * `background-position` (70% on phones, per globals.css), three stacked veil
 * layers and a min-height box, none of which an absolutely positioned `<img>`
 * reproduces without re-implementing them as `object-position` and per-breakpoint
 * Tailwind classes. Migrating would trade a rendering guarantee for a component,
 * not gain one.
 *
 * What the background *fetches* is a separate problem, and it is handled the way
 * the Next.js docs prescribe for exactly this case ("Background CSS"): ask
 * `getImageProps` for the srcset the image optimizer would use, then hand that
 * srcset to CSS as an `image-set()`. The browser then downloads one rendition at
 * the width and format it actually needs — a phone no longer pulls a 2 MB
 * desktop-sized upload — while the layer stays a plain background with zero
 * client-side JavaScript, no layout participation and no CLS risk.
 *
 * Custom properties carry the result to the stylesheet (see globals.css for
 * why `background-image` is declared more than once): `--hero-backdrop-src` is
 * original URL, used verbatim by browsers that cannot parse the enhanced values,
 * and `--hero-backdrop-set` / `--hero-backdrop-set-wide` are `1x`/`2x`
   * `image-set()` pairs, one for phones and one for 1024px-and-up.
    *
    * A caveat worth stating: `image-set()` has no `sizes` companion and accepts no
    * size descriptors, so the browser picks between only two candidates. That is
    * coarser than an `<img>` srcset, and it is why there are two tiers at all.
 *
 * The bundled default is deliberately left on its hand-generated 1672px WebP
 * and takes this path only when an admin has actually set an image. That asset
 * is already size- and format-optimized, and routing it back through
 * `/_next/image` would only re-encode it — including upscaling it for the 1920w
 * and 2048w candidates the optimizer offers.
 *
 * Two veil layers sit above the photograph: a horizontal one that keeps the left
 * column readable, and a short top fade that lets the sticky navbar melt into it.
 * Both are warm off-white at low alpha — the image is never darkened.
 *
 * There is deliberately no `<link rel="preload">` here. React emits such a link
 * twice in the streamed HTML, and the source is chosen per viewport by a media
 * query the preload cannot know, so it could only ever be a guess. The stylesheet
 * is render-blocking, so the request starts a few kilobytes into the CSS download
 * regardless.
 *
 * `settings.heroTitle` / `settings.heroSubtitle` still override the copy when
 * the admin has filled them in, so this screen stays editable from /admin/pengaturan.
 */

interface HeroSectionProps {
  settings: SiteSettingsDTO;
}

/**
 * Turns an `image-set()`-compatible srcset into the CSS function.
 *
 * `getImageProps` hands back entries shaped `<url> <descriptor>` joined by
 * `", "`. Only the URL is wrapped; the descriptor is carried through untouched.
 * The split is anchored on the last space because a `/_next/image` URL has
 * `?url=…&w=…` and can never contain one of its own.
 *
 * The descriptors this produces are `1x` / `2x` and NOT `640w`, and that is
 * load-bearing. `image-set()` takes only `[ <image> | <string> ] [ <resolution>
 * || type(<string>) ]?` (CSS Images 4 §3.1) — size descriptors are not part of
 * the grammar. Confirmed in Chrome 154: `CSS.supports('background-image',
 * 'image-set(url("a.png") 640w)')` is **false** and the computed value is `none`.
 * So a `sizes` srcset cannot be passed through as-is: the declaration is invalid
 * against the grammar and Chrome discards it, leaving the fallback below.
 */
function toImageSet(srcSet: string): string {
  const candidates = srcSet.split(', ').map((candidate) => {
    const separator = candidate.lastIndexOf(' ');
    return `url("${candidate.slice(0, separator)}") ${candidate.slice(separator + 1)}`;
  });

  return `image-set(${candidates.join(', ')})`;
}

/**
 * A source `/_next/image` will not serve.
 *
 * SVG is refused unless `dangerouslyAllowSVG` is enabled (it is not), and a
 * request for one answers 400 — which would leave the hero blank instead of
 * rendering the photograph. The extension is matched case-insensitively and
 * ahead of any query string, which Next's own lowercase `.endsWith('.svg')`
 * check does not do.
 */
const UNOPTIMIZABLE_SOURCE = /\.svg(?:$|[?#])/i;

/**
 * Base widths, in CSS pixels of hero box, for the two `image-set()` tiers.
 *
 * Because only `<resolution>` is available, an `image-set()` carries exactly two
 * candidates and the browser picks between them from the background box and the
 * device pixel ratio — there is no `sizes` companion to steer it, so the choice
 * of base width has to be made here. `getImageProps` without `sizes` and with a
 * `width` maps that to `width` and `width * 2`, rounded up to a configured
 * device size, giving the `1x` / `2x` pair.
 *
 * 828 is the narrow tier: it is a configured device size, so a phone at 1x
 * takes 828w and at 2x takes 1920w. 1920 is the wide tier, switched in at the
 * same 1024px the hero's own layout and veil already use.
 */
const HERO_TIER_WIDTHS = { narrow: 828, wide: 1920 } as const;

/**
 * Builds the enhanced `background-image` value for `.hero-backdrop` from an
 * admin-supplied URL: an `image-set()` of the renditions the image optimizer
 * would serve, as `1x` / `2x`.
 *
 * Every path that cannot produce a srcset returns a plain `url()` of the original
 * source, so the worst case is exactly the pre-optimization behaviour.
 *
 * The caller supplies that plain-`url()` value separately as
 * `--hero-backdrop-src`, because `globals.css` declares `background-image` more
 * than once so a browser which cannot parse these values keeps the original URL
 * rather than losing the photograph.
 */
function heroImageSet(src: string, baseWidth: number): string {
  const plainUrl = `url("${src}")`;

  if (UNOPTIMIZABLE_SOURCE.test(src)) return plainUrl;

  let srcSet: string | undefined;

  try {
    srcSet = getImageProps({
      src,
      // The layer is `aria-hidden` and the copy carries the meaning; this only
      // satisfies the required prop, no `<img>` is ever emitted.
      alt: '',
      /*
       * `width` is what makes getImageProps emit a `1x`/`2x` pair instead of a
       * `640w` srcset — see `toImageSet`. `height` only has to be a number:
       * it is used for the intrinsic ratio, which nothing here consumes, because
       * the layer is cropped by `background-size: cover`. It is set to roughly
       * the hero's own landscape proportion so it is not misleading to read.
       */
      width: baseWidth,
      height: Math.round(baseWidth / 2),
    }).props.srcSet;
  } catch (error) {
    /*
     * The default loader validates `images.remotePatterns` and *throws* for a
     * host that is not allow-listed — but only outside production, so this is
     * the dev-only path where an admin URL on an unlisted host would otherwise
     * take the whole storefront down with a render error.
     *
     * The hosts this project's CSP `img-src` allows (Cloudinary and Unsplash)
     * are exactly the hosts `next.config.ts` allow-lists, so in production such
     * a URL is refused either way; falling back here keeps development behaving
     * like production instead of the other way round.
     */
    console.warn(
      `[hero] Falling back to the unoptimized backdrop for "${src}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );

    return plainUrl;
  }

  // `data:` and `blob:` sources are also served unoptimized, so no srcset.
  return srcSet ? toImageSet(srcSet) : plainUrl;
}

export default function HeroSection({ settings }: HeroSectionProps) {
  const headline = settings.heroTitle?.trim();
  const subline = settings.heroSubtitle?.trim();
  /*
   * Trimmed and blank-checked rather than merely null-checked: a row that was
   * saved with only whitespace would otherwise produce `url("")` and request the
   * page itself as the hero photograph.
   */
  const heroImageUrl = settings.heroImageUrl?.trim() || undefined;
  const whatsappHref = settings.whatsappNumber
    ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`
    : null;

  /*
   * Custom properties rather than a direct `backgroundImage`: the stylesheet
   * owns the fallback cascade, and an inline `background-image` would outrank the
   * enhanced declarations and take the fallback down with it.
   *
   * Two tiers because `image-set()` only speaks `<resolution>` — see
   * `HERO_TIER_WIDTHS`. The stylesheet switches to the wide pair at 1024px.
   *
   * `as CSSProperties` is the standard escape for custom properties — TypeScript
   * cannot know the names this stylesheet declares. Omitted entirely when no
   * admin image is set, so the stylesheet's own default is what renders.
   */
  const backdropVars = heroImageUrl
    ? ({
        '--hero-backdrop-src': `url("${heroImageUrl}")`,
        '--hero-backdrop-set': heroImageSet(heroImageUrl, HERO_TIER_WIDTHS.narrow),
        '--hero-backdrop-set-wide': heroImageSet(heroImageUrl, HERO_TIER_WIDTHS.wide),
      } as CSSProperties)
    : undefined;

  return (
    <section
      className="relative isolate flex items-center overflow-hidden bg-[#FBF9F6] min-h-[540px] sm:min-h-[640px] lg:min-h-[720px]"
      aria-label="Studio Marmer"
    >
        {/* ─── Background photograph ──────────────────────────────── */}
        {/*
          The photograph is a CSS background layer, not an <Image>, so `cover`
          does the cropping and nothing hydrates to render it.

          An admin-uploaded image replaces the bundled asset through the two
          custom properties above, which the `.hero-backdrop` rule consumes. The
          class still carries the crop, positioning and breakpoint rules, so
          swapping the source cannot change the layout. When `heroImageUrl` is
          null no custom property is set at all and the element falls through to
          the stylesheet, rendering /images/hero-marble-vanity-1672.webp — the
          pre-existing behaviour, which is what every install sees until an admin
          sets an image.

          The inline properties are *not* a plain `background-image`: an inline
          declaration would outrank both rules in the stylesheet and the
          browser-compatibility fallback with it. That cascade is the stylesheet's
          job, so only the values are handed over here.
        */}
        <div
          className="hero-backdrop absolute inset-0 -z-10"
          style={backdropVars}
          aria-hidden="true"
        />

        {/* Veil: softens the left column for legibility and fades the top edge
            into the sticky navbar. Warm off-white, never a dark scrim. */}
        <div className="hero-veil absolute inset-0 -z-10" aria-hidden="true" />

        {/* Carries the photograph into the cream section below. */}
        <div className="hero-foot absolute inset-x-0 bottom-0 h-40 -z-10" aria-hidden="true" />

        {/* ─── Content ─────────────────────────────────────────────── */}
        <div className="relative w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pt-14 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-28">
          <div className="max-w-xl lg:max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#8B7355] font-medium mb-6 animate-fade-up">
              Marble Store - Studio Marmer Collection
            </p>

            <h1 className="text-[clamp(2rem,5.5vw,4.2rem)] font-light leading-[1.12] tracking-tight text-[#1A1A1A] mb-6 animate-fade-up">
              {headline ?? (
                <>
                  Keindahan batu alam,
                  <br />
                  <span className="font-medium">Dibentuk dengan Ketelitian.</span>
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
                'Dari tempat sabun hingga nampan kecil, kami membuat berbagai kerajinan marmer dengan tetap memperlihatkan corak alami batunya.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-fade-up">
              <Link
                href="/#katalog"
                className="bg-[#1A1A1A] text-white hover:bg-[#333333] transition-all duration-300 inline-flex items-center justify-center gap-3 px-7 sm:px-8 py-3.5 text-[11px] uppercase tracking-[0.16em] font-medium"
              >
                Lihat Produk
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