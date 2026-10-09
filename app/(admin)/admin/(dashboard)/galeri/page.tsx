import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Pencil } from 'lucide-react';

import { countAdminGalleryItems, listAdminGalleryItems } from '@/lib/data/admin/gallery';
import DeleteGalleryItemButton from './DeleteGalleryItemButton';
import GalleryOrderControls from './GalleryOrderControls';

export const metadata: Metadata = {
  title: 'Galeri',
};

type SearchParams = Promise<{
  status?: string;
}>;

/**
 * Admin gallery list — Server Component.
 *
 * All database work happens here via the admin DAL, so no Client Component imports
 * Prisma. The status filter is read from the URL, so a filtered view is shareable
 * and survives a refresh.
 *
 * ORDERING IS READ TWICE, ON PURPOSE
 * The rendered list honours the status filter, but the move controls need each
 * photo's position in the *complete* sequence — with a filter applied, "the row
 * above" is ambiguous. The unfiltered order is therefore read alongside the
 * filtered rows and only its positions are used, so the admin keeps their filter
 * while still moving a photo exactly one place in the real sequence.
 *
 * Not paginated, unlike the category list: a gallery is a small curated board the
 * admin scans at once, and splitting it across pages would hide the ordering this
 * module exists to manage.
 */
export default async function GalleryAdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const status =
    params.status === 'active' || params.status === 'inactive'
      ? params.status
      : 'all';

  const [items, total, ordered] = await Promise.all([
    listAdminGalleryItems({
      isActive: status === 'active' ? true : status === 'inactive' ? false : null,
    }),
    // Counted independently of the filtered list: the header states the size of
    // the whole gallery, not the size of the current view.
    countAdminGalleryItems(),
    listAdminGalleryItems(),
  ]);

  const orderedIds = ordered.map((row) => row.id);
  const hasFilters = status !== 'all';

  return (
    <main className="p-6 sm:p-8 max-w-6xl mx-auto">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#666666] hover:text-[#1A1A1A] transition-colors font-medium mb-5"
      >
        <ArrowLeft size={12} strokeWidth={1.5} aria-hidden="true" /> Kembali ke Dashboard
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-1.5">
            Modul
          </span>
          <h1 className="text-2xl font-light text-[#1A1A1A] tracking-tight">
            Galeri
          </h1>
          <p className="text-xs text-[#999999] mt-1">{total} foto di galeri</p>
        </div>

        <Link
          href="/admin/galeri/tambah"
          className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-5 py-3 text-[11px] uppercase tracking-[0.14em] font-medium hover:bg-[#333333] transition-colors duration-300"
        >
          Tambah Foto
        </Link>
      </div>

      {/* ─── Filters ─────────────────────────────────────────────── */}
      <form
        method="get"
        action="/admin/galeri"
        className="border border-[#E5E1DA] bg-white p-4 mb-5 flex flex-wrap items-end gap-3"
      >
        <div className="min-w-[150px]">
          <label
            htmlFor="status"
            className="block text-[9px] uppercase tracking-[0.16em] text-[#999999] font-medium mb-1.5"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="w-full border border-[#E5E1DA] bg-white focus:border-[#1A1A1A] outline-none text-[13px] px-3 py-2.5 font-light"
          >
            <option value="all">Semua foto</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>

        <button
          type="submit"
          className="border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors duration-300 px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] font-medium"
        >
          Terapkan
        </button>

        {hasFilters && (
          <Link
            href="/admin/galeri"
            className="text-[11px] uppercase tracking-[0.14em] text-[#999999] hover:text-[#1A1A1A] transition-colors py-2.5"
          >
            Reset
          </Link>
        )}
      </form>

      {/* ─── List ────────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="border border-[#E5E1DA] bg-white py-16 px-6 text-center">
          <p className="text-sm font-light text-[#1A1A1A] mb-1">
            {hasFilters
              ? 'Tidak ada foto dengan status tersebut.'
              : 'Galeri masih kosong.'}
          </p>
          <p className="text-xs text-[#999999] font-light mb-5">
            {hasFilters
              ? 'Coba pilih status lain untuk melihat foto yang tersedia.'
              : 'Tambahkan foto pertama untuk mengisi halaman galeri pelanggan.'}
          </p>
          {!hasFilters && (
            <Link
              href="/admin/galeri/tambah"
              className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-3 text-[11px] uppercase tracking-[0.14em] font-medium hover:bg-[#333333] transition-colors"
            >
              Tambah Foto
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item, index) => (
            <li key={item.id} className="border border-[#E5E1DA] bg-white flex flex-col">
              <div className="relative aspect-[4/3] bg-[#F3F1EE] overflow-hidden border-b border-[#E5E1DA]">
                <Image
                  src={item.imageUrl}
                  alt={item.altText?.trim() || item.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className="object-cover"
                />
                <span className="absolute top-2 left-2 bg-[#1A1A1A]/85 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-white">
                  #{index + 1}
                </span>
                {!item.isActive && (
                  <span className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[#666666]">
                    Nonaktif
                  </span>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <Link
                  href={`/admin/galeri/${item.id}/edit`}
                  className="text-[13px] font-medium text-[#1A1A1A] hover:underline truncate"
                >
                  {item.title}
                </Link>

                {item.description && (
                  <p className="mt-1 text-[11px] text-[#999999] font-light line-clamp-2">
                    {item.description}
                  </p>
                )}

                <p className="mt-2 text-[10px] text-[#C9C4BC] font-light">
                  Urutan {item.sortOrder}
                  {item.altText?.trim() ? '' : ' · tanpa teks alternatif'}
                </p>

                <div className="mt-4 pt-3 border-t border-[#E5E1DA] flex items-center gap-1.5 flex-wrap">
                  <Link
                    href={`/admin/galeri/${item.id}/edit`}
                    className="inline-flex items-center gap-1.5 border border-[#E5E1DA] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors"
                    aria-label={`Edit ${item.title}`}
                  >
                    <Pencil size={11} strokeWidth={1.5} aria-hidden="true" />
                    Edit
                  </Link>

                  <DeleteGalleryItemButton itemId={item.id} itemTitle={item.title} />

                  <GalleryOrderControls
                    itemId={item.id}
                    itemTitle={item.title}
                    position={orderedIds.indexOf(item.id)}
                    total={orderedIds.length}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-[10px] text-[#C9C4BC] font-light">
        Foto aktif tampil di halaman galeri pelanggan sesuai urutan di atas. Foto
        nonaktif hanya tersimpan di dashboard.
      </p>
    </main>
  );
}