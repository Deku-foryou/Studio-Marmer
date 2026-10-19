import Link from 'next/link';
import { getImageProps } from 'next/image';
import { ArrowRight, MessageCircle } from 'lucide-react';
import type { CSSProperties } from 'react';
import { normalizeWhatsAppNumber } from '@/lib/utils';
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
 * The photograph IS preloaded, and this comment used to say it should not be.
 * That reasoning was wrong twice over. `fetchPriority` is not something CSS can
 * carry, so a preload link is the only way to prioritise a background image at
 * all; and "the source is chosen by a media query the preload cannot know" is no
 * longer true either — there are exactly two tiers, and they are known here.
 *
 * Measured on a production build under slow 4G with a cold cache: without the
 * preload the browser cannot discover the photograph until the render-blocking
 * stylesheet has finished, so the request starts ~690 ms into the load, later
 * than every script and the font on the page. With it, ~240 ms.
 *
 * On this dynamic route React flushes `<head>` twice and the single-file case
 * therefore appears in it twice. That is known and deliberately left alone: the
 * two are byte-identical, and the browser dedupes them into one request — checked
 * at five viewport/DPR combinations, each showing exactly one hero request, issued
 * by the parser at priority High.
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
 * The bundled photograph, preloaded when no admin image is set.
 *
 * This is the path `app/globals.css` falls back to (lines 160-161). The two must
 * stay identical or the preload fetches one file and the backdrop paints
 * another — the exact double download the preload exists to avoid. That is also
 * why this case gets a plain `href` preload rather than an `imageSrcSet`: with
 * one known static URL there is no candidate for the browser to disagree about.
 */
const DEFAULT_HERO_IMAGE = '/images/hero-marble-vanity-1672.webp';

/**
 * What `.hero-backdrop` needs, plus what a preload link needs, from one call.
 *
 * Keeping both in a single return is the whole point: the CSS and the preload
 * are handed the *same* two candidates, so they cannot drift, and the media
 * query below lines up with the `@media (min-width: 1024px)` rule in globals.css
 * that switches the tiers.
 */
interface HeroBackdropSources {
  /** The `background-image` value: an `image-set(...)`, or a plain `url(...)`. */
  imageSet: string;
  /**
   * The optimizer's srcset, for `<link rel="preload" imageSrcSet>`.
   *
   * Absent when there is nothing to preload through the optimizer — an SVG, a
   * data:/blob: source, or a host the allow-list rejects. The preload is then
   * skipped rather than pointed at a URL that would 400.
   */
  srcSet?: string;
}

/**
 * Builds the enhanced `background-image` value for `.hero-backdrop` from an
 * admin-supplied URL: an `image-set()` of the renditions the image optimizer
 * would serve, as `1x` / `2x` — plus the srcset behind it, so the preload link
 * can advertise the very same two candidates.
 *
 * Every path that cannot produce a srcset returns a plain `url()` of the original
 * source and no srcset, so the worst case is exactly the pre-optimization
 * behaviour.
 *
 * The caller supplies that plain-`url()` value separately as
 * `--hero-backdrop-src`, because `globals.css` declares `background-image` more
 * than once so a browser which cannot parse these values keeps the original URL
 * rather than losing the photograph.
 */
function heroBackdropSources(src: string, baseWidth: number): HeroBackdropSources {
  const plainUrl = `url("${src}")`;

  if (UNOPTIMIZABLE_SOURCE.test(src)) return { imageSet: plainUrl };

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

    return { imageSet: plainUrl };
  }

  // `data:` and `blob:` sources are also served unoptimized, so no srcset.
  return srcSet ? { imageSet: toImageSet(srcSet), srcSet } : { imageSet: plainUrl };
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
  /*
   * The CTA deliberately has no prefilled message, so this builds the bare
   * wa.me URL rather than calling `buildWhatsAppLink`, which appends
   * `?text=…`. It shares the normaliser with the other call sites though:
   * `normalizeWhatsAppNumber` strips formatting and expands a leading `0` to
   * `62`. On any value written through the admin form this is a no-op — the
   * schema stores digits only, already in country-code form, matching
   * /^\d{8,15}$/ — so the rendered link is unchanged.
   */
  const whatsappDigits = normalizeWhatsAppNumber(settings.whatsappNumber);
  const whatsappHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits}`
    : null;

  /*
   * Both tiers are resolved once and used twice: the CSS below and the preload
   * beside it. Deriving them separately would be the one way this could preload a
   * file the backdrop never paints.
   */
  const narrow = heroImageUrl
    ? heroBackdropSources(heroImageUrl, HERO_TIER_WIDTHS.narrow)
    : { imageSet: '' };
  const wide = heroImageUrl
    ? heroBackdropSources(heroImageUrl, HERO_TIER_WIDTHS.wide)
    : { imageSet: '' };

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
        '--hero-backdrop-set': narrow.imageSet,
        '--hero-backdrop-set-wide': wide.imageSet,
      } as CSSProperties)
    : undefined;

  /*
   * The preload, in the three shapes the two cases can take:
   *
   *  - an admin image that the optimizer can serve gets one link per tier,
   *    each `media`-scoped to the same breakpoint globals.css uses, each
   *    advertising the exact srcset the CSS will paint. One link matches any
   *    given viewport, so this cannot become two requests.
   *  - no admin image gets a plain `href` for the bundled file. One known URL,
   *    no candidate selection, nothing for the browser to get wrong.
   *  - an admin image the optimizer refuses (SVG, unlisted host) gets nothing:
   *    preloading a URL that would 400 wastes a request to buy nothing.
   */
  const preload = !heroImageUrl ? (
    <link rel="preload" as="image" fetchPriority="high" type="image/webp" href={DEFAULT_HERO_IMAGE} />
  ) : narrow.srcSet && wide.srcSet ? (
    <>
      <link
        rel="preload"
        as="image"
        fetchPriority="high"
        media="(max-width: 1023px)"
        imageSrcSet={narrow.srcSet}
      />
      <link
        rel="preload"
        as="image"
        fetchPriority="high"
        media="(min-width: 1024px)"
        imageSrcSet={wide.srcSet}
      />
    </>
  ) : null;

  return (
    <section
      className="relative isolate flex items-center overflow-hidden bg-[#FBF9F6] min-h-[540px] sm:min-h-[640px] lg:min-h-[720px]"
      aria-label="Studio Marmer"
    >
        {/*
          The preload sits at the top of the document flow so the parser meets it
          while the render-blocking stylesheet is still downloading — which is the
          entire point. React 19 hoists it into <head> when it can; either way it
          is discovered long before the CSS could have revealed the photograph.
        */}
        {preload}

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
                  <span className="font-medium">dibentuk dengan ketelitian.</span>
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