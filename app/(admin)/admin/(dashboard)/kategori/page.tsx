import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'

import { listAdminCategories } from '@/lib/data/admin/categories'
import DeleteCategoryButton from './DeleteCategoryButton'

export const metadata: Metadata = {
  title: 'Kategori',
}

type SearchParams = Promise<{
  q?: string
  status?: string
  page?: string
}>

const PAGE_SIZE = 20

/**
 * Admin category list — Server Component.
 *
 * All database work happens here (via the admin DAL) so no Client Component
 * ever imports Prisma. Search, status filter and pagination are read from the
 * URL, so a filtered view is shareable and survives a refresh. Each row links to
 * the edit screen and carries its own guarded delete control.
 */
export default async function CategoryPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams

  const search = (params.q ?? '').trim()
  const status =
    params.status === 'active' || params.status === 'inactive' ? params.status : 'all'
  const requestedPage = params.page ? Number(params.page) : 1

  const { categories, total } = await listAdminCategories({
    search: search || undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : null,
    page: Number.isFinite(requestedPage) ? requestedPage : 1,
  })

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, requestedPage), pageCount)

  const hasFilters = Boolean(search) || status !== 'all'

  /** Builds a link that keeps the active filters and swaps one parameter. */
  function linkWith(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams()
    const merged: Record<string, string | undefined> = {
      q: search || undefined,
      status: status !== 'all' ? status : undefined,
      page: undefined,
      ...overrides,
    }

    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value)
    }

    const qs = next.toString()
    return qs ? `/admin/kategori?${qs}` : '/admin/kategori'
  }

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
            Daftar Kategori
          </h1>
          <p className="text-xs text-[#999999] mt-1">{total} kategori terdaftar</p>
        </div>

        <Link
          href="/admin/kategori/tambah"
          className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-5 py-3 text-[11px] uppercase tracking-[0.14em] font-medium hover:bg-[#333333] transition-colors duration-300"
        >
          Tambah Kategori
        </Link>
      </div>

      {/* ─── Filters ─────────────────────────────────────────────── */}
      <form
        method="get"
        action="/admin/kategori"
        className="border border-[#E5E1DA] bg-white p-4 mb-5 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="q"
            className="block text-[9px] uppercase tracking-[0.16em] text-[#999999] font-medium mb-1.5"
          >
            Cari nama
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Nama kategori…"
            className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3 py-2.5 font-light"
          />
        </div>

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
            <option value="all">Semua kategori</option>
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
            href="/admin/kategori"
            className="text-[11px] uppercase tracking-[0.14em] text-[#999999] hover:text-[#1A1A1A] transition-colors py-2.5"
          >
            Reset
          </Link>
        )}
      </form>

      {/* ─── Table ───────────────────────────────────────────────── */}
      {categories.length === 0 ? (
        <div className="border border-[#E5E1DA] bg-white py-16 px-6 text-center">
          <p className="text-sm font-light text-[#1A1A1A] mb-1">
            Tidak ada kategori yang ditemukan.
          </p>
          <p className="text-xs text-[#999999] font-light mb-5">
            {hasFilters
              ? 'Coba ubah kata kunci atau filter yang dipilih.'
              : 'Tambahkan kategori pertama untuk mulai mengisi katalog.'}
          </p>
          <Link
            href="/admin/kategori/tambah"
            className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-3 text-[11px] uppercase tracking-[0.14em] font-medium hover:bg-[#333333] transition-colors"
          >
            Tambah Kategori
          </Link>
        </div>
      ) : (
        <div className="border border-[#E5E1DA] bg-white overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-[#E5E1DA]">
                {['Kategori', 'Slug', 'Urutan', 'Produk', 'Status', 'Aksi'].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-4 py-3 text-[9px] uppercase tracking-[0.16em] text-[#999999] font-medium"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr
                  key={category.id}
                  className="border-b border-[#E5E1DA] last:border-b-0 hover:bg-[#FBF9F6] transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/kategori/${category.id}/edit`}
                      className="block text-[13px] font-medium text-[#1A1A1A] hover:underline truncate max-w-[240px]"
                    >
                      {category.name}
                    </Link>
                    {category.description && (
                      <p className="text-[10px] text-[#C9C4BC] truncate max-w-[240px]">
                        {category.description}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-[11px] text-[#C9C4BC] font-light whitespace-nowrap">
                    /kategori/{category.slug}
                  </td>

                  <td className="px-4 py-3 text-[13px] text-[#666666] font-light whitespace-nowrap">
                    {category.sortOrder}
                  </td>

                  <td className="px-4 py-3 text-[13px] text-[#666666] font-light whitespace-nowrap">
                    {category.productCount}
                  </td>

                  <td className="px-4 py-3">
                    {category.isActive ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[#5C8A5C] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5C8A5C]" aria-hidden="true" />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[#999999] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C9C4BC]" aria-hidden="true" />
                        Nonaktif
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/kategori/${category.id}/edit`}
                        className="inline-flex items-center gap-1.5 border border-[#E5E1DA] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors"
                        aria-label={`Edit ${category.name}`}
                      >
                        <Pencil size={11} strokeWidth={1.5} aria-hidden="true" />
                        Edit
                      </Link>
                      <DeleteCategoryButton
                        categoryId={category.id}
                        categoryName={category.name}
                        productCount={category.productCount}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Pagination ───────────────────────────────────────────── */}
      {pageCount > 1 && (
        <nav aria-label="Navigasi halaman" className="mt-5 flex items-center justify-between gap-4">
          <p className="text-[11px] text-[#999999] font-light">
            Halaman {currentPage} dari {pageCount}
          </p>
          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Link
                href={linkWith({ page: String(currentPage - 1) })}
                className="border border-[#E5E1DA] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-[#1A1A1A] hover:bg-white transition-colors"
              >
                Sebelumnya
              </Link>
            ) : (
              <span className="border border-[#E5E1DA] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-[#C9C4BC] cursor-not-allowed select-none">
                Sebelumnya
              </span>
            )}

            {currentPage < pageCount ? (
              <Link
                href={linkWith({ page: String(currentPage + 1) })}
                className="border border-[#E5E1DA] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-[#1A1A1A] hover:bg-white transition-colors"
              >
                Berikutnya
              </Link>
            ) : (
              <span className="border border-[#E5E1DA] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-[#C9C4BC] cursor-not-allowed select-none">
                Berikutnya
              </span>
            )}
          </div>
        </nav>
      )}

      <p className="mt-6 text-[10px] text-[#C9C4BC] font-light">
        Menampilkan {PAGE_SIZE} kategori per halaman.
      </p>
    </main>
  )
}