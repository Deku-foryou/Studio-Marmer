'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { PRODUCTS } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';
import { ArrowLeft, ChevronDown, Plus, Minus, Truck, ShieldCheck, RefreshCw } from 'lucide-react';

const EDITORIAL_COPYWRITING: Record<string, string> = {
  prod_001: 'Crafted with meticulous material integrity, the Sony WH-1000XM5 Pro Wireless Headphones represent the pinnacle of modern acoustic engineering. Featuring custom-designed 40mm drivers and a carbon-fiber reinforced chassis, every frequency is rendered with extreme fidelity, isolating you in a silent, high-performance soundstage.',
  prod_002: 'The Apple MacBook Pro 16" with M4 Max is engineered for ultimate performance. Machined from 100% recycled aerospace-grade aluminum, its design achieves structural perfection while housing a thermodynamic engine that remains silent under the heaviest workloads.',
  prod_003: 'Crafted from Grade 5 aerospace titanium, the Samsung Galaxy S25 Ultra is a monument to modern mobile technology. Its satin-finished contour integrates seamlessly with a high-fidelity display, framing a massive camera sensor designed for cinematic detail.',
  prod_004: 'The DJI Osmo Pocket 3 is a masterpiece of miniaturized stabilization. Its 3-axis motorized mechanical gimbal is constructed from carbon composites, enabling fluid, cinematic capture of motion with zero physical delay in a highly pocketable form.',
  prod_005: 'The ASUS ROG Zephyrus G16 is a high-performance gaming laptop with an obsidian anodized aluminum chassis. Its vapor chamber cooling system and 240Hz OLED Nebula display deliver uncompromising performance in an ultra-thin minimalist frame.',
  prod_006: 'An exercise in extreme durability, the Apple Watch Ultra 2 features a 49mm aerospace-grade titanium case and flat sapphire front crystal. Built to withstand temperatures from high desert heat to arctic cold, its dual-frequency GPS delivers unmatched safety.',
  prod_007: 'The Google Pixel 9 Pro XL is defined by sculptural excellence and advanced AI integration. A polished metal camera bar flows into a matte glass back, housing a computational photography engine that captures light with professional depth.',
  prod_008: 'The Sony Alpha 7R V full-frame mirrorless camera is a photographer\'s dream. Built around a robust magnesium-alloy chassis, it houses a 61MP high-resolution sensor and an AI-driven real-time tracking autofocus engine for peerless precision.',
  prod_009: 'Designed for tactile enthusiasts, the Razer BlackWidow V4 Pro features a solid aluminum alloy top plate and magnetic leatherette wrist rest. Its Razer Orange switches provide silent, tactile keypresses for fluid typing and gaming precision.',
  prod_010: 'The Bose QuietComfort Ultra Earbuds represent the gold standard in spatial audio. Featuring proprietary CustomTune sound calibration, they actively map the acoustic profile of your ear canal to tailor noise cancellation and sound stage perfectly.',
  prod_011: 'The LG UltraGear OLED 27" gaming monitor is a visual powerhouse. Its self-lit OLED pixels deliver infinite contrast and 0.03ms response time, mounted on an ergonomic workspace stand with ambient Hexagon lighting for aesthetic immersion.',
  prod_012: 'At just 5.1mm, the iPad Pro 13" M4 is the thinnest device Apple has ever created. Its breakthrough tandem OLED display delivers stunning contrast, powered by the M4 chip to bring desktop-class creative workflows to a portable canvas.',
  prod_013: 'Forged from grade 5 titanium, the Samsung Galaxy Ring represents the future of invisible bio-tracking. Free of screens, it monitors sleep, skin temperature, and heart rates with absolute discretion, achieving up to 9 days of battery life.',
  prod_014: 'The Anker 250W GaNPrime desktop charger is a multi-port charging station housed in a fire-retardant thermal casing. Utilizing advanced gallium nitride technology, it distributes up to 250W of power intelligently across 6 devices with absolute safety.',
  prod_015: 'The GoPro HERO 13 Black is the ultimate rugged capture device. Featuring a hydrophobic lens cover and a rubberized shockproof shell, its HyperSmooth 7.0 stabilization guarantees fluid action footage in the most punishing conditions.',
  prod_016: 'An ergonomic masterpiece, the Logitech MX Master 3S is sculpted to fit the natural contours of the hand. Machined steel scroll wheels utilize electromagnetic resistance for silent, ultra-fast scrolling across multiple screens.',
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const { addToCart, openDrawer } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('specs');

  const product = PRODUCTS.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FBF9F6] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-light text-[#1A1A1A] mb-4">Product Not Found</h1>
        <p className="text-sm text-[#666666] mb-8 font-light">The collection item you requested does not exist or has been retired.</p>
        <Link href="/" className="bg-[#1A1A1A] text-white px-6 py-3 text-xs uppercase tracking-widest font-medium hover:bg-[#333333] transition-colors">
          Return to Catalog
        </Link>
      </div>
    );
  }

  const description = EDITORIAL_COPYWRITING[product.id] || product.shortDescription;

  const handleAddToCart = () => {
    setIsAdding(true);
    addToCart(product);
    setTimeout(() => {
      setIsAdding(false);
      openDrawer();
    }, 600);
  };

  const toggleAccordion = (name: string) => {
    setActiveAccordion(activeAccordion === name ? null : name);
  };

  return (
    <main className="min-h-screen bg-[#FBF9F6] pt-28 pb-36 px-6 sm:px-8 lg:px-16 max-w-7xl mx-auto">
      {/* ─── Back Nav ────────────────────────────────────────── */}
      <div className="mb-10 animate-fade-in-up" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#666666] hover:text-[#1A1A1A] transition-colors font-medium group link-underline"
        >
          <ArrowLeft size={12} className="transition-transform group-hover:-translate-x-1" />
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
            <div className="animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#999999] font-medium">
                {product.brand}
                <span className="text-[#8B7355]"> · {product.stockStatus}</span>
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
              {product.originalPrice > product.price && (
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
              {description}
            </p>

            {/* ─── Accordions ──────────────────────────────────────── */}
            <div
              className="border-t border-[#E5E1DA] mt-6 animate-fade-in-up"
              style={{ animationDelay: '450ms', animationFillMode: 'both' }}
            >
              {/* Technical Specifications */}
              <div className="border-b border-[#E5E1DA]">
                <button
                  onClick={() => toggleAccordion('specs')}
                  className="w-full py-4 flex items-center justify-between text-left text-xs uppercase tracking-widest text-[#1A1A1A] font-medium"
                >
                  Technical Specifications
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-300 ${activeAccordion === 'specs' ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    activeAccordion === 'specs' ? 'max-h-96 opacity-100 pb-5' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="grid grid-cols-2 gap-3">
                    {product.specifications.map((spec) => (
                      <div key={spec.label} className="border border-[#E5E1DA] bg-white p-3.5">
                        <p className="text-[9px] uppercase tracking-wider text-[#999999] mb-1">
                          {spec.label}
                        </p>
                        <p className="text-xs font-light text-[#1A1A1A]">
                          {spec.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shipping & Delivery */}
              <div className="border-b border-[#E5E1DA]">
                <button
                  onClick={() => toggleAccordion('shipping')}
                  className="w-full py-4 flex items-center justify-between text-left text-xs uppercase tracking-widest text-[#1A1A1A] font-medium"
                >
                  Shipping & Delivery
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-300 ${activeAccordion === 'shipping' ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    activeAccordion === 'shipping' ? 'max-h-96 opacity-100 pb-5' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="text-xs text-[#666666] leading-relaxed font-light space-y-3">
                    <p>
                      Shipping options and delivery times are confirmed at the
                      point of order.
                    </p>
                  </div>
                </div>
              </div>

              {/* Warranty Accordion */}
              <div className="border-b border-[#E5E1DA]">
                <button
                  onClick={() => toggleAccordion('warranty')}
                  className="w-full py-4 flex items-center justify-between text-left text-xs uppercase tracking-widest text-[#1A1A1A] font-medium"
                >
                  Care & Warranty
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-300 ${activeAccordion === 'warranty' ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    activeAccordion === 'warranty' ? 'max-h-96 opacity-100 pb-5' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="text-xs text-[#666666] leading-relaxed font-light">
                    Care instructions and warranty terms are provided with each
                    item.
                  </p>
                </div>
              </div>
            </div>

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

      {/* ─── Sticky bottom bar for mobile ───────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FBF9F6]/95 backdrop-blur-md border-t border-[#E5E1DA] px-6 py-4 z-40 flex items-center justify-between shadow-sm md:px-12 md:hidden">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest text-[#999999]">{product.brand}</span>
          <span className="text-xs font-medium text-[#1A1A1A] truncate max-w-[150px]">{product.title}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-[#1A1A1A]">{formatPrice(product.price)}</span>
          <button
            onClick={handleAddToCart}
            disabled={isAdding || product.stockStatus === 'Out of Stock'}
            className="bg-[#1A1A1A] text-white hover:bg-[#333333] transition-colors px-6 py-3 text-[10px] tracking-widest uppercase font-semibold disabled:opacity-40 cursor-pointer"
          >
            {isAdding ? 'Adding…' : 'Add to Bag'}
          </button>
        </div>
      </div>

      {/* ─── Standard buy section button (Desktop) ───────────────── */}
      <div
        className="hidden md:block max-w-md ml-auto mt-12 animate-fade-in-up"
        style={{ animationDelay: '550ms', animationFillMode: 'both' }}
      >
        <button
          onClick={handleAddToCart}
          disabled={isAdding || product.stockStatus === 'Out of Stock'}
          className="w-full bg-[#1A1A1A] text-white hover:bg-[#333333] transition-all duration-300 py-4 text-xs tracking-widest uppercase font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isAdding ? 'Adding to Collection…' : 'Add to Collection Bag'}
        </button>
      </div>
    </main>
  );
}
