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
