/**
 * Brand constants for Studio Marmer.
 *
 * Single source of truth for the wordmark and primary navigation, shared by
 * the Navbar, Footer and metadata so they can never drift apart.
 */

export const BRAND = {
  /** Wordmark. Rendered as "Studio Marmer". */
  name: 'Studio Marmer',
  /** Two-line lockup for tight spaces. */
  nameTop: 'Studio',
  nameBottom: 'Marmer',
  tagline: 'Kerajinan Marmer',
  description:
    'Studio kerajinan marmer dengan karakter alami, dibuat untuk menghadirkan sentuhan elegan pada setiap ruang.',
} as const;

/** Primary customer-facing navigation. Order matters in the desktop bar. */
export const NAV_LINKS = [
  { href: '/#katalog', label: 'Katalog' },
  { href: '/tentang-kami', label: 'Tentang Kami' },
  { href: '/galeri', label: 'Galeri' },
  { href: '/kontak', label: 'Kontak' },
] as const;
