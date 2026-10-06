import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Tentang Kami — ${BRAND.name}`,
  description:
    'Studio Marmer mengukir potongan marmer menjadi benda yang dipakai setiap hari, dengan menghormati karakter alami setiap batu.',
  alternates: { canonical: '/tentang-kami' },
};

const PRINSIP = [
  {
    title: 'Bahan pilihan',
    body: 'Hanya mengambil blok yang uratnya terbaca jelas saat dipahat.',
  },
  {
    title: 'Pengerjaan tangan',
    body: 'Pemahatan dan pengasahan dilakukan satu per satu tanpa mesin.',
  },
  {
    title: 'Jujur soal corak',
    body: 'Menjelaskan perbedaan antar satuan, bukan menyembunyikannya.',
  },
  {
    title: 'Pembelian transparan',
    body: 'Transaksi diproses di Shopee dengan status yang bisa dilacak.',
  },
] as const;

const PROSES = [
  {
    nomor: '01',
    judul: 'Pilih blok',
    detail: 'Menyisipkan blok dan mencari arah urat terbaik.',
  },
  {
    nomor: '02',
    judul: 'Pahat',
    detail: 'Bentuk kasar dikerjakan dengan pahat.',
  },
  {
    nomor: '03',
    judul: 'Asah',
    detail: 'Permukaan dibulatkan dan tepi dihaluskan.',
  },
  {
    nomor: '04',
    judul: 'Detail',
    detail: 'Pengeboran dan lekukan akhir sesuai fungsi.',
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
          Sebuah studio kecil yang dikerjakan dengan tangan.
        </h1>
      </section>

      {/* ─── Narasi ───────────────────────────────────────────────── */}
      <section className="border-y border-[#E5E1DA] bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-7 space-y-5">
            <h2 className="text-xl sm:text-2xl font-light text-[#1A1A1A] tracking-tight">
              Kenapa marmer?
            </h2>
            <p className="text-sm text-[#666666] leading-relaxed font-light">
              Marmer adalah bahan yang langsung terasa saat disentuh: dingin,
              berat, dan punya pola yang tidak pernah terulang. Dua potongan dari
              blok yang sama pun akan terlihat berbeda setelah dipahat. Bagi
              kami, itu alasan utama memilih marmer untuk kerajinan tangan.
            </p>
            <p className="text-sm text-[#666666] leading-relaxed font-light">
              Kami membuat benda yang benar-benar dipakai setiap hari: tempat
              tisu di meja ruang tamu, tempat soap di dekat wastafel, nampan
              kecil di atas meja. Benda yang sering disentuh akan makin menarik
              seiring waktu.
            </p>
            <p className="text-sm text-[#666666] leading-relaxed font-light">
              Karena setiap satuan berbeda, foto di katalog ini adalah contoh
              bentuk dan karakter batunya, bukan foto persis barang yang akan
              Anda terima. Untuk melihat corak satu satuan tertentu, silakan
              minta foto tambahan lewat WhatsApp.
            </p>
          </div>

          <aside className="lg:col-span-5">
            <div className="border border-[#E5E1DA] bg-[#FBF9F6] p-6 sm:p-7">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#8B7355] font-medium mb-5">
                Prinsip kerja
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
          Dari blok menjadi benda
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
