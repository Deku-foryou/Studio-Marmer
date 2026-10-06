import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Centralised money formatter.
 *
 * Indonesian Rupiah, grouped with the locale's dot separator and rendered
 * without decimal places, e.g. 325000 -> "Rp325.000".
 *
 * This is the ONLY place currency is formatted - call sites must not build
 * their own Intl.NumberFormat, so a future currency change stays in one file.
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    // id-ID inserts a non-breaking space between the symbol and the digits
    // ("Rp 325.000"). The storefront displays it tight ("Rp325.000"), so the
    // separator is removed here rather than at every call site.
    .replace(/\u00A0/g, '');
}

/**
 * Normalises a WhatsApp contact number into the digits-only, country-code form
 * that wa.me expects. Accepts the human formats an admin might paste in
 * ("+62 812-3456-7890", "(62) 812 3456 7890", "6281234567890").
 *
 * Returns null when nothing usable is present, so callers can hide the CTA
 * instead of rendering a broken link.
 */
export function normalizeWhatsAppNumber(raw: string | null): string | null {
  if (!raw) return null;

  let digits = raw.replace(/\D/g, '');

  // Drop a leading 0 that is not part of a country code (e.g. 0812... -> 62812...)
  if (digits.startsWith('0')) {
    digits = `62${digits.slice(1)}`;
  }

  return digits.length >= 8 ? digits : null;
}

/**
 * Builds a wa.me deep link with a prefilled message.
 * Returns null when no valid number is configured.
 */
export function buildWhatsAppLink(
  rawNumber: string | null,
  message: string
): string | null {
  const digits = normalizeWhatsAppNumber(rawNumber);
  if (!digits) return null;

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
