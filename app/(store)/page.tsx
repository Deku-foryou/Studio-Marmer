import HeroSection from '@/components/layout/HeroSection';
import CategoriesSection from '@/components/sections/CategoriesSection';
import WhatsAppCta from '@/components/sections/WhatsAppCta';
import ProductGrid from '@/components/product/ProductGrid';
import { FilterProvider } from '@/context/FilterContext';
import {
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
 *
 * NO FEATURED STRIP
 * A "Produk Unggulan" strip used to sit between the category strip and the
 * about section. It was removed because `isFeatured` and the catalog's default
 * sort select the same rows, so every product it showed reappeared on page 1 of
 * the catalog directly below - the homepage listed the same four products twice.
 * `getFeaturedProducts()` and the `isFeatured` column are deliberately kept:
 * the strip is a rendering decision, not a data one, and admin can still manage
 * the flag for it.
 *
 * NO MATERIAL SECTION
 * A "Mengenal jenis marmer" block used to sit here, listing four stone types
 * with hand-written descriptions hardcoded in JSX. It was removed for the same
 * reason as the featured strip: the copy described material the client has not
 * confirmed, and two of the four entries were not natural marble at all. It was
 * inline markup rather than a component, so there was nothing separate to
 * delete. It should return as real, client-supplied content - ideally sourced
 * from product data rather than hardcoded.
 */
interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const query = parseCatalogQuery(params);

  const [settings, categories, counts, catalog] = await Promise.all([
    getSiteSettings(),
    getCategories(),
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
