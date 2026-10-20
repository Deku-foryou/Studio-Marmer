import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageCircle, Truck, Check } from 'lucide-react';

import { getProductBySlug } from '@/lib/data/products';
import { getSiteSettings } from '@/lib/data/site';
import { buildWhatsAppLink, formatPrice } from '@/lib/utils';
import { absoluteUrl } from '@/lib/site-url';
import ProductImageGallery from '@/components/product/ProductImageGallery';
import ProductDetailAccordion from '@/components/product/ProductDetailAccordion';
import ProductPurchaseActions from '@/components/product/ProductPurchaseActions';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Per-product SEO metadata, generated on the server.
 * `notFound()` guarantees a real HTTP 404 for unknown slugs.
 */
export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: 'Produk tidak ditemukan' };
  }

  return {
    title: product.title,
    description: product.shortDescription,
    alternates: { canonical: `/produk/${product.slug}` },
    openGraph: {
      title: product.title,
      description: product.shortDescription,
      type: 'website',
      locale: 'id_ID',
      /*
       * The absolute URL of this exact product. Without it a share preview can
       * resolve the link against whatever the scraper treats as the base, and
       * two products shared from different entry points can be reported as the
       * same URL. It mirrors `alternates.canonical`, so the page has exactly one
       * identity — the same string, resolved through the same `metadataBase`.
       */
      url: `/produk/${product.slug}`,
      images: product.imageUrl
        ? [{ url: product.imageUrl, alt: product.imageAlt }]
        : [{ url: '/images/hero-marble-vanity-1672.webp', alt: 'Studio Marmer - produk marmer' }],
    },
    other: {
      'product:price:amount': product.price.toString(),
      'product:price:currency': 'IDR',
      'product:availability': product.isAvailable ? 'in stock' : 'out of stock',
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  const [product, settings] = await Promise.all([
    getProductBySlug(slug),
    getSiteSettings(),
  ]);

  // Real 404 — renders the not-found boundary with a 404 status.
  if (!product) {
    notFound();
  }

  const productPath = `/produk/${product.slug}`;
  const productUrl = absoluteUrl(productPath);
  const soldOut = !product.isAvailable;
  const showOriginal =
    product.originalPrice !== null && product.originalPrice > product.price;

  const generalWhatsAppHref = buildWhatsAppLink(
    settings.whatsappNumber,
    'Halo Studio Marmer, saya ingin menanyakan tentang produk yang Anda jual.'
  );

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.imageUrl
      ? [product.imageUrl]
      : [absoluteUrl('/images/hero-marble-vanity-1672.webp')],
    description: product.description,
    offers: {
      '@type': 'Offer',
      price: product.price.toString(),
      priceCurrency: 'IDR',
      availability: product.isAvailable
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: productUrl,
    },
  };

  return (
    <main className="min-h-screen bg-[#FBF9F6] pt-10 sm:pt-14 pb-20 px-6 sm:px-8 lg:px-16 max-w-7xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      {/* ─── Back nav ──────────────────────────────────────────────── */}
      <div
        className="mb-8 sm:mb-10 animate-fade-in-up"
        style={{ animationDelay: '0ms', animationFillMode: 'both' }}
      >
        <Link
          href="/#katalog"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#666666] hover:text-[#1A1A1A] transition-colors font-medium group link-underline"
        >
          <ArrowLeft
            size={12}
            className="transition-transform group-hover:-translate-x-1"
          />
          Kembali ke Katalog
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
        {/* ─── Gallery ────────────────────────────────────────────── */}
        <div
          className="lg:sticky lg:top-28 animate-fade-in-up"
          style={{ animationDelay: '100ms', animationFillMode: 'both' }}
        >
          <ProductImageGallery
            imageUrls={product.imageUrls}
            alt={product.imageAlt}
            overlay={
              product.isUniquePiece
                ? 'Satu-satunya'
                : showOriginal
                  ? `−${product.discountPercentage}%`
                  : undefined
            }
          />
        </div>

        {/* ─── Product information ─────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* Category + availability */}
          <div
            className="flex items-center gap-2 animate-fade-in-up"
            style={{ animationDelay: '200ms', animationFillMode: 'both' }}
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#999999] font-medium">
              {product.category}
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#8B7355]">
              {soldOut ? '• Stok Habis' : '• Tersedia'}
            </span>
          </div>

          {/* Name */}
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: '250ms', animationFillMode: 'both' }}
          >
            <span className="block text-[10px] uppercase tracking-[0.2em] text-[#999999] font-medium mb-2">
              Nama Produk
            </span>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[#1A1A1A] leading-tight">
              {product.title}
            </h1>
          </div>

          {/* Stone type */}
          {product.stoneType && (
            <div
              className="animate-fade-in-up"
              style={{ animationDelay: '300ms', animationFillMode: 'both' }}
            >
              <span className="block text-[10px] uppercase tracking-[0.2em] text-[#999999] font-medium mb-1">
                Jenis Batu
              </span>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#8B7355]">
                {product.stoneType}
              </p>
            </div>
          )}

          {/* Price */}
          <div
            className="border-t border-[#E5E1DA] pt-6 animate-fade-in-up"
            style={{ animationDelay: '350ms', animationFillMode: 'both' }}
          >
            <span className="block text-[10px] uppercase tracking-[0.2em] text-[#999999] font-medium mb-3">
              Harga
            </span>
            {product.pricingType === 'STARTING_FROM' && (
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[#999999] mb-1">
                Mulai dari
              </span>
            )}
            <div className="flex items-baseline gap-3 flex-wrap">
              <span
                className={`text-2xl font-light tracking-tight ${
                  soldOut ? 'text-[#999999]' : 'text-[#1A1A1A]'
                }`}
              >
                {formatPrice(product.price)}
              </span>
              {product.originalPrice !== null &&
                product.originalPrice > product.price && (
                  <span className="text-base text-[#C9C4BC] line-through font-light">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
            </div>
          </div>

          {/* Short description */}
          <p
            className="text-sm text-[#666666] leading-relaxed font-light animate-fade-in-up"
            style={{ animationDelay: '400ms', animationFillMode: 'both' }}
          >
            {product.shortDescription}
          </p>

          {/* Description */}
          <div
            className="border-t border-[#E5E1DA] pt-6 animate-fade-in-up"
            style={{ animationDelay: '430ms', animationFillMode: 'both' }}
          >
            <span className="block text-[10px] uppercase tracking-[0.2em] text-[#999999] font-medium mb-3">
              Deskripsi
            </span>
            <p className="text-sm text-[#666666] leading-relaxed font-light whitespace-pre-line">
              {product.description}
            </p>
          </div>

          {/* Highlight chips */}
          <div
            className="flex flex-wrap items-center gap-x-5 gap-y-2 animate-fade-in-up"
            style={{ animationDelay: '460ms', animationFillMode: 'both' }}
          >
            {product.isUniquePiece && (
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#1A1A1A] border border-[#D8D0C4] px-2.5 py-1 font-medium">
                <Check size={11} strokeWidth={2} />
                Satu-satunya
              </span>
            )}
            {product.craftingTime && (
              <span className="text-[10px] uppercase tracking-wider text-[#666666] font-medium">
                Pembuatan {product.craftingTime}
              </span>
            )}
          </div>

          {/* Accordions */}
          <ProductDetailAccordion
            specifications={product.specifications}
            material={product.material}
            stoneType={product.stoneType}
            color={product.color}
            dimensions={product.dimensions}
            weightGrams={product.weightGrams}
          />

          {/* Purchase actions */}
          <div
            className="pt-2 animate-fade-in-up"
            style={{ animationDelay: '520ms', animationFillMode: 'both' }}
          >
            <ProductPurchaseActions
              product={product}
              productUrl={productUrl}
              fallbackShopeeUrl={settings.shopeeUrl}
              whatsappNumber={settings.whatsappNumber}
            />
          </div>

          {/* Generic contact fallback when the product has WhatsApp disabled */}
          {!product.whatsappEnabled && generalWhatsAppHref && (
            <a
              href={generalWhatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#8B7355] hover:text-[#1A1A1A] transition-colors"
            >
              <MessageCircle size={12} strokeWidth={1.5} />
              Hubungi Studio Marmer
            </a>
          )}

          {/* Honest, non-promissory notes */}
          <div
            className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 animate-fade-in-up"
            style={{ animationDelay: '560ms', animationFillMode: 'both' }}
          >
            <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#666666] font-medium">
              <Truck size={12} className="text-[#8B7355]" strokeWidth={1.5} />
              Pengiriman dikonfirmasi saat pemesanan
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
