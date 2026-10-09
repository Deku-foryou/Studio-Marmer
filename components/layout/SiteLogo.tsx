'use client';

/**
 * Site logo — Client Component.
 *
 * The logo is the one brand element an admin can replace, so it is the one that
 * has to render as an image rather than as type. When `logoUrl` is set this
 * renders the uploaded file; when it is null the caller keeps rendering the text
 * wordmark instead, which is the pre-existing look and the safe fallback.
 *
 * WHY NOT next/image
 * A logo is usually a small mark on a transparent background, and next/image
 * would re-encode it into WebP/AVIF with a lossy pass that softens thin letter
 * edges — exactly the detail a wordmark is made of. The optimization also adds
 * nothing here: these files are a few KB and are already served at the edge by
 * Cloudinary. A plain `<img>` keeps the delivered bytes as uploaded.
 *
 * It is a Client Component only because Navbar, one of its two hosts, already is
 * one and the value arrives as a prop — no server-only code is reachable here.
 *
 * `decoding="async"` keeps a large logo from blocking the first paint, and
 * `object-contain` preserves the aspect ratio whatever the uploaded file is. The
 * height cap means an unusually tall upload cannot break a fixed-height bar.
 */

interface SiteLogoProps {
  /** Cloudinary delivery URL or site-relative path. Null/blank renders nothing. */
  logoUrl: string | null;
  /** Studio name, used as alt text so the logo still names the site. */
  siteName: string;
  className?: string;
}

export default function SiteLogo({
  logoUrl,
  siteName,
  className,
}: SiteLogoProps) {
  const src = logoUrl?.trim();

  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={siteName}
      decoding="async"
      className={className ?? 'h-7 sm:h-8 w-auto object-contain'}
    />
  );
}
