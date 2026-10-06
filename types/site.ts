/**
 * Serialized site-wide configuration.
 *
 * Mirrors the `site_settings` singleton row (id = 1). Optional fields are
 * nullable because the row may be only partially configured - the UI must
 * degrade gracefully rather than assume every channel is set up.
 */
export interface SiteSettingsDTO {
  siteName: string;
  logoUrl: string | null;
  /** Digits only, country code included, e.g. "6281234567890". */
  whatsappNumber: string | null;
  shopeeUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  email: string | null;
  address: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
}
