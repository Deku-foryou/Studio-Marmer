import { ShoppingBag, MessageCircle, ExternalLink } from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/utils';
import type { ProductDetail } from '@/types/product';

/**
 * Product purchase actions — Server Component.
 *
 * Studio Marmer has no internal checkout: every purchase happens externally on
 * Shopee or over WhatsApp. Both CTAs are plain external links, so no client
 * JavaScript is required for them.
 *
 * Resolution rules:
 *  - Shopee: the product's own `shopeeUrl` wins; otherwise the store-wide
 *    `SiteSettings.shopeeUrl` is used as a fallback.
 *  - WhatsApp: hidden entirely when the product has `whatsappEnabled = false`,
 *    or when no WhatsApp number has been configured on the site settings.
 */

interface ProductPurchaseActionsProps {
  product: ProductDetail;
  /** Canonical path of this page, used to build the product URL in the message. */
  productUrl: string;
  /** Store-wide fallback, may be null. */
  fallbackShopeeUrl: string | null;
  /** Store-wide WhatsApp number, may be null. */
  whatsappNumber: string | null;
}

export default function ProductPurchaseActions({
  product,
  productUrl,
  fallbackShopeeUrl,
  whatsappNumber,
}: ProductPurchaseActionsProps) {
  const shopeeUrl = product.shopeeUrl ?? fallbackShopeeUrl;

  const soldOut = !product.isAvailable;

  // Prefilled message: product name first, then the page it was linked from.
  const whatsappMessage = [
    `Halo Studio Marmer, saya tertarik dengan "${product.title}".`,
    '',
    `Detail produk: ${productUrl}`,
    '',
    'Apakah produk ini masih tersedia?',
  ].join('\n');

  const whatsappHref = product.whatsappEnabled
    ? buildWhatsAppLink(whatsappNumber, whatsappMessage)
    : null;

  return (
    <div className="space-y-3">
      {/* ─── Primary: Shopee ─────────────────────────────────────── */}
      {shopeeUrl ? (
        <a
          href={shopeeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full inline-flex items-center justify-center gap-2.5 bg-[#1A1A1A] text-white py-4 px-6 text-[11px] uppercase tracking-[0.16em] font-medium transition-all duration-300 ${
            soldOut ? 'opacity-50' : 'hover:bg-[#333333]'
          }`}
          aria-label={`Beli ${product.title} di Shopee (membuka di tab baru)`}
        >
          <ShoppingBag size={14} strokeWidth={1.5} />
          Beli di Shopee
          <ExternalLink size={11} strokeWidth={1.5} className="opacity-60" />
        </a>
      ) : (
        <div className="w-full inline-flex items-center justify-center gap-2.5 border border-[#E5E1DA] bg-[#F3F1EE] text-[#999999] py-4 px-6 text-[11px] uppercase tracking-[0.16em] font-medium cursor-not-allowed">
          <ShoppingBag size={14} strokeWidth={1.5} />
          Belum tersedia di Shopee
        </div>
      )}

      {/* ─── Secondary: WhatsApp ─────────────────────────────────── */}
      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full inline-flex items-center justify-center gap-2.5 border border-[#D8D0C4] text-[#1A1A1A] py-4 px-6 text-[11px] uppercase tracking-[0.16em] font-medium transition-all duration-300 ${
            soldOut ? 'opacity-50' : 'hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A]'
          }`}
          aria-label={`Pesan ${product.title} via WhatsApp (membuka di tab baru)`}
        >
          <MessageCircle size={14} strokeWidth={1.5} />
          Pesan via WhatsApp
          <ExternalLink size={11} strokeWidth={1.5} className="opacity-60" />
        </a>
      )}

      {/* ─── Not available ───────────────────────────────────────── */}
      {soldOut && (
        <p className="text-center text-[10px] uppercase tracking-[0.16em] text-[#999999] pt-1">
          Produk sedang tidak tersedia
        </p>
      )}

      {shopeeUrl && (
        <p className="text-[10px] text-[#999999] leading-relaxed text-center pt-1">
          Pembelian diproses melalui Shopee. Hubungi kami via WhatsApp untuk
          menanyakan ketersediaan.
        </p>
      )}
    </div>
  );
}
