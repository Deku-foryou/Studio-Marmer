import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Truck, ShieldCheck } from 'lucide-react';

import { getProductBySlug } from '@/lib/data/products';
import { formatPrice } from '@/lib/utils';
import ProductDetailAccordion from '@/components/product/ProductDetailAccordion';
import ProductDetailActions from '@/components/product/ProductDetailActions';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Per-product SEO metadata, generated on the server.
 * `notFound()` here guarantees a real HTTP 404 for unknown slugs.
 */
export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: 'Produk tidak ditemukan' };
  }

  const priceLabel = formatPrice(product.price);

  return {
    title: `${product.title} — Studio Marmer`,
    description: product.shortDescription,
    openGraph: {
      title: `${product.title} — Studio Marmer`,
      description: product.shortDescription,
      type: 'website',
      images: product.imageUrl
        ? [{ url: product.imageUrl, alt: product.imageAlt }]
        : undefined,
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
  const product = await getProductBySlug(slug);

  // Real 404 - renders next/navigation's not-found boundary with a 404 status.
  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#FBF9F6] pt-28 pb-36 px-6 sm:px-8 lg:px-16 max-w-7xl mx-auto">
      {/* ─── Back Nav ────────────────────────────────────────── */}
      <div
        className="mb-10 animate-fade-in-up"
        style={{ animationDelay: '0ms', animationFillMode: 'both' }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#666666] hover:text-[#1A1A1A] transition-colors font-medium group link-underline"
        >
          <ArrowLeft
            size={12}
            className="transition-transform group-hover:-translate-x-1"
          />
          Back to Collection
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* ─── Left Side: Product Image ────────────────────────── */}
        <div
          className="lg:sticky lg:top-28 h-auto max-h-[calc(100vh-140px)] animate-fade-in-up"
          style={{ animationDelay: '100ms', animationFillMode: 'both' }}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden border border-[#E5E1DA] bg-white group">
            <Image
              src={product.imageUrl}
              alt={product.imageAlt}
              fill
              priority
              className="w-full max-h-[70vh] object-contain mx-auto bg-transparent transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            {product.discountPercentage > 0 && (
              <div className="absolute top-4 left-4">
                <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[#1A1A1A] bg-white/95 px-3 py-1.5 border border-[#E5E1DA]">
                  −{product.discountPercentage}% Special Save
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Side: Editorial Info ──────────────────────── */}
        <div className="flex flex-col justify-between">
          <div className="flex flex-col gap-6">
            {/* Brand + Status */}
            <div
              className="animate-fade-in-up"
              style={{ animationDelay: '200ms', animationFillMode: 'both' }}
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#999999] font-medium">
                {product.brand}
                <span className="text-[#8B7355]">
                  {' '}
                  · {product.stockStatus}
                </span>
              </p>
            </div>

            {/* Title */}
            <h1
              className="text-3xl sm:text-4xl font-light tracking-tight text-[#1A1A1A] leading-tight animate-fade-in-up"
              style={{ animationDelay: '250ms', animationFillMode: 'both' }}
            >
              {product.title}
            </h1>

            {/* Price */}
            <div
              className="flex items-baseline gap-3 animate-fade-in-up"
              style={{ animationDelay: '350ms', animationFillMode: 'both' }}
            >
              <span className="text-2xl font-light text-[#1A1A1A] tracking-tight">
                {formatPrice(product.price)}
              </span>
              {product.pricingType === 'STARTING_FROM' && (
                <span className="text-[10px] uppercase tracking-wider text-[#999999]">
                  Mulai dari
                </span>
              )}
              {product.originalPrice !== null &&
                product.originalPrice > product.price && (
                  <span className="text-base text-[#C9C4BC] line-through font-light">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
            </div>

            {/* Description */}
            <p
              className="text-sm text-[#666666] leading-relaxed font-light animate-fade-in-up"
              style={{ animationDelay: '400ms', animationFillMode: 'both' }}
            >
              {product.description}
            </p>

            {/* ─── Accordions (client extract) ─────────────────────── */}
            <ProductDetailAccordion
              specifications={product.specifications}
              craftingTime={product.craftingTime}
              weightGrams={product.weightGrams}
            />

            {/* ─── Static Highlights ───────────────────────────────── */}
            <div
              className="flex items-center gap-6 mt-4 animate-fade-in-up"
              style={{ animationDelay: '500ms', animationFillMode: 'both' }}
            >
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#666666] font-medium">
                <Truck size={12} className="text-[#8B7355]" />
                Shipping Available
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#666666] font-medium">
                <ShieldCheck size={12} className="text-[#8B7355]" />
                Warranty Support
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Purchase actions (client extract) ───────────────────── */}
      <ProductDetailActions
        product={product}
        compactLabel="Tambah"
        fullLabel="Tambah ke Koleksi"
        pendingLabel="Menambah..."
      />
    </main>
  );
}
