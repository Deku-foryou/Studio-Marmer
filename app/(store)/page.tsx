import HeroSection from '@/components/layout/HeroSection';
import CategoriesSection from '@/components/sections/CategoriesSection';
import WhatsAppCta from '@/components/sections/WhatsAppCta';
import ProductCard from '@/components/product/ProductCard';
import ProductGrid from '@/components/product/ProductGrid';
import { FilterProvider } from '@/context/FilterContext';
import {
  getFeaturedProducts,
  getCategories,
  getCatalogProducts,
  getProductCountsByCategory,
} from '@/lib/data/products';
import { getSiteSettings } from '@/lib/data/site';
import { PRODUCTS_PER_PAGE, parseCatalogQuery } from '@/lib/catalog-query';

/**
 * Homepage — Server Component.
 *
 * Data flow:
 *   MySQL -> Prisma -> lib/data/products.ts -> this page -> client UI
 *
 * All Prisma reads and Decimal -> number serialization happen on the server;
 * the client only receives plain JSON-safe props.
 *
 * CATALOG PAGINATION
 * The catalog reads `searchParams` (filter / sort / search / page) and asks the
 * data access layer for exactly one page of 8 products. Reading searchParams
 * makes this route dynamic - which is the point: the result set has to be
 * queried per request for `?page=2` to mean anything.
 */
interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const query = parseCatalogQuery(params);

  const [settings, categories, featured, counts, catalog] = await Promise.all([
    getSiteSettings(),
    getCategories(),
    getFeaturedProducts(),
    getProductCountsByCategory(),
    getCatalogProducts({
      page: query.page,
      pageSize: PRODUCTS_PER_PAGE,
      search: query.search,
      categories: query.categories,
      inStockOnly: query.inStockOnly,
      sort: query.sort,
    }),
  ]);

  return (
    <>
      <HeroSection settings={settings} />

      <CategoriesSection categories={categories} counts={counts} />

      {/* ─── Featured ────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section
          aria-labelledby="unggulan-heading"
          className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pb-16 sm:pb-20"
        >
          <div className="mb-8 sm:mb-10 border-b border-[#E5E1DA] pb-8">
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-2">
              Pilihan
            </span>
            <h2
              id="unggulan-heading"
              className="text-2xl sm:text-3xl font-light text-[#1A1A1A] tracking-tight mb-2"
            >
              Produk Unggulan
            </h2>
            <p className="text-[#666666] text-sm max-w-md font-light">
              Sebagian karya yang paling sering ditanyakan, dengan corak marmer
              yang dipilih satu per satu.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.slice(0, 4).map((product, index) => (
              <div
                key={product.id}
                className="animate-fade-up h-full"
                style={{
                  animationDelay: `${Math.min(index * 60, 360)}ms`,
                  animationFillMode: 'both',
                }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── About ───────────────────────────────────────────────── */}
      <section
        aria-labelledby="tentang-heading"
        className="border-y border-[#E5E1DA] bg-white"
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-start">
          <div>
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-3">
              Tentang Kami
            </span>
            <h2
              id="tentang-heading"
              className="text-2xl sm:text-3xl font-light text-[#1A1A1A] tracking-tight leading-snug mb-5"
            >
              Marmer tidak pernah sama satu pun.
            </h2>
            <p className="text-sm text-[#666666] leading-relaxed font-light mb-4">
              Studio Marmer mengukir potongan marmer menjadi benda yang dipakai
              setiap hari: tempat tisu, tempat sabun, holder, nampan, dan vas
              kecil untuk sudut ruangan.
            </p>
            <p className="text-sm text-[#666666] leading-relaxed font-light mb-4">
              Karena berasal dari alam, setiap satuan punya urat, warna, dan
              keebalan yang berbeda. Kami memperlakukan perbedaan itu sebagai
              ciri, bukan cacat.
            </p>
            <p className="text-sm text-[#666666] leading-relaxed font-light">
              Untuk pertanyaan detail, ukuran, atau ketersediaan satuan
              tertentu, silakan hubungi kami. Jawaban biasanya diberikan pada hari yang
              sama.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-[#E5E1DA] border border-[#E5E1DA]">
            {[
              {
                title: 'Bahan',
                body: 'Marmer pilihan sesuai karakter tiap karya.',
              },
              {
                title: 'Teknik',
                body: 'Dipahat, diasah, dan dibulatkan dengan tangan.',
              },
              {
                title: 'Fungsi',
                body: 'Objek harian yang dibuat agar tahan lama.',
              },
              {
                title: 'Karakter',
                body: 'Motif alami tidak pernah sama antar satuan.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-white px-5 py-6">
                <h3 className="text-[10px] uppercase tracking-[0.18em] text-[#8B7355] font-medium mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-[#666666] leading-relaxed font-light">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Material ────────────────────────────────────────────── */}
      <section
        aria-labelledby="bahan-heading"
        className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-16 sm:py-24"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
          <div>
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-3">
              Bahan
            </span>
            <h2
              id="bahan-heading"
              className="text-2xl sm:text-3xl font-light text-[#1A1A1A] tracking-tight leading-snug"
            >
              Mengenal jenis marmer
            </h2>
          </div>

          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                name: 'Carrara',
                note: 'Putih keabu-abuan dengan urat tipis dan lembut.',
              },
              {
                name: 'Travertine',
                note: 'Krem hangat dengan pori-pori yang khas.',
              },
              {
                name: 'Nero Marquina',
                note: 'Hitam pekat dengan urat putih yang kontras.',
              },
              {
                name: 'Verde Luisa',
                note: 'Hijau muda yang tenang, cocok untuk nuansa lembut.',
              },
            ].map((stone) => (
              <div key={stone.name} className="border-t border-[#E5E1DA] pt-4">
                <h3 className="text-[12px] uppercase tracking-[0.16em] text-[#1A1A1A] font-medium mb-1.5">
                  {stone.name}
                </h3>
                <p className="text-xs text-[#666666] leading-relaxed font-light">
                  {stone.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Catalog ─────────────────────────────────────────────── */}
      <FilterProvider>
        <div id="katalog" className="scroll-mt-24">
          <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pb-16 sm:pb-20">
            <div className="mb-8 sm:mb-10 border-b border-[#E5E1DA] pb-8">
              <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-2">
                Katalog
              </span>
              <h2 className="text-2xl sm:text-3xl font-light text-[#1A1A1A] tracking-tight mb-2">
                Semua Produk
              </h2>
              <p className="text-[#666666] text-sm max-w-md font-light">
                Telusuri seluruh karya yang tersedia. Gunakan pencarian dan filter
                untuk mempersempit pilihan.
              </p>
            </div>

            <ProductGrid
              products={catalog.products}
              categories={categories}
              pagination={catalog}
            />
          </section>
        </div>
      </FilterProvider>

      <WhatsAppCta settings={settings} />
    </>
  );
}
