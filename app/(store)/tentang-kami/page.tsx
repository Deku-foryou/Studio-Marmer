import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tentang Kami',
  description:
    'Studio Marmer mengolah marmer menjadi tempat tisu, tempat sabun, nampan, dan vas kecil. Setiap potongan punya corak dan warna yang berbeda.',
  alternates: { canonical: '/tentang-kami' },
  openGraph: {
    title: 'Tentang Kami',
    description:
      'Studio Marmer mengolah marmer menjadi tempat tisu, tempat sabun, nampan, dan vas kecil. Setiap potong punya corak dan warna yang berbeda.',
    url: '/tentang-kami',
    images: [{ url: '/images/hero-marble-vanity-1672.webp', alt: 'Studio Marmer - tentang kami' }],
  },
};

/**
 * Rendered per request, never prerendered at build.
 *
 * This page's own markup is fully static, but it renders inside the store
 * layout, whose Navbar/Footer read the `site_settings` row via Prisma. Marking
 * the route dynamic keeps that read at request runtime: a static prerender
 * would query MySQL from the build worker, where the database is unreachable,
 * and fail the production build — the same failure seen on `/galeri`.
 */
export const dynamic = 'force-dynamic';

/**
 * Practical facts, deliberately NOT the same four points as the homepage's
 * about strip. Repeating those verbatim on a second page made the same
 * sentence appear twice in one short visit.
 *
 * Every line below states something the site can actually show or do: the
 * product fields that exist, and the two channels that are wired up. Nothing
 * here promises delivery time, custom work, or a guarantee.
 */
const PRINSIP = [
  {
    title: 'Jenis marmer',
    body: 'Setiap produk mencantumkan jenis marmer yang dipakai.',
  },
  {
    title: 'Ukuran',
    body: 'Dimensi dan berat tercantum pada halaman produk.',
  },
  {
    title: 'Pembelian',
    body: 'Pembelian diproses melalui Shopee.',
  },
  {
    title: 'Pertanyaan',
    body: 'Sertakan nama produk agar kami bisa menjawab dengan tepat.',
  },
] as const;

const PROSES = [
  {
    nomor: '01',
    judul: 'Pemilihan Batu',
    detail: 'Menentukan Batu marmer dengan corak yang sesuai.',
  },
  {
    nomor: '02',
    judul: 'Pembentukan',
    detail: 'Marmer dipotong dan dibentuk sesuai ukuran.',
  },
  {
    nomor: '03',
    judul: 'Pemolesan',
    detail: 'Permukaan dan tepian dirapikan.',
  },
  {
    nomor: '04',
    judul: 'Quality Check',
    detail: 'Bentuk dan detail diperiksa sebelum produk siap digunakan.',
  },
] as const;

export default function AboutPage() {
  return (
    <main className="bg-[#FBF9F6]">
      {/* ─── Intro ────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pt-16 sm:pt-24 pb-14 sm:pb-20">
        <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-3">
          Tentang Kami
        </span>
        <h1 className="text-[clamp(2rem,4.5vw,3.4rem)] font-light leading-[1.12] tracking-tight text-[#1A1A1A] max-w-3xl">
          Kami mengolah marmer menjadi sebuah Maha Karya.
        </h1>
      </section>

      {/* ─── Narasi ───────────────────────────────────────────────── */}
      <section className="border-y border-[#E5E1DA] bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-7 space-y-5">
            <h2 className="text-xl sm:text-2xl font-light text-[#1A1A1A] tracking-tight">
              Yang kami suka dari marmer
            </h2>
            <p className="text-sm text-[#666666] leading-relaxed font-light">
              Daya Tarik Marmer
              Corak dan warna marmer terbentuk murni oleh alam. Itulah mengapa setiap potongan punya karakter unik, tidak ada dua barang yang coraknya 100% sama persis.
            </p>
            <p className="text-sm text-[#666666] leading-relaxed font-light">
              Kami membuat berbagai benda yang digunakan sehari-hari, seperti
              tempat tisu, tempat sabun, dan nampan kecil. Bentuknya dibuat
              sesuai fungsi, sementara corak batunya tetap menjadi bagian dari
              tampilan produk.
            </p>
            <p className="text-sm text-[#666666] leading-relaxed font-light">
              Foto di katalog menunjukkan contoh bentuk dan corak. Tampilan batu
              pada produk yang tersedia bisa sedikit berbeda dari foto.
            </p>
          </div>

          <aside className="lg:col-span-5">
            <div className="border border-[#E5E1DA] bg-[#FBF9F6] p-6 sm:p-7">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#8B7355] font-medium mb-5">
                Yang perlu diketahui
              </h3>
              <ul className="space-y-4">
                {PRINSIP.map((item) => (
                  <li key={item.title}>
                    <h4 className="text-[11px] uppercase tracking-[0.16em] text-[#1A1A1A] font-medium mb-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[#666666] leading-relaxed font-light">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* ─── Proses ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-14 sm:py-20">
        <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-3">
          Proses
        </span>
        <h2 className="text-xl sm:text-2xl font-light text-[#1A1A1A] tracking-tight mb-8 sm:mb-10">
          Dari batu hingga siap digunakan
        </h2>

        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#E5E1DA] border border-[#E5E1DA]">
          {PROSES.map((step) => (
            <li key={step.nomor} className="bg-[#FBF9F6] px-5 py-7">
              <span className="block text-[10px] tracking-[0.2em] text-[#C9C4BC] font-medium mb-3">
                {step.nomor}
              </span>
              <h3 className="text-[12px] uppercase tracking-[0.14em] text-[#1A1A1A] font-medium mb-2">
                {step.judul}
              </h3>
              <p className="text-xs text-[#666666] leading-relaxed font-light">
                {step.detail}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
