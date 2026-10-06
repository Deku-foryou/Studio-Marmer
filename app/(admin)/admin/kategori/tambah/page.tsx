import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CategoryForm from '../Form'

export const metadata = {
  title: 'Tambah Kategori',
}

export default async function CategoryTambahPage() {
  return (
    <main className="p-6 sm:p-8 max-w-4xl mx-auto">
      <Link
        href="/admin/kategori"
        className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#666666] hover:text-[#1A1A1A] transition-colors font-medium mb-5"
      >
        <ArrowLeft size={12} strokeWidth={1.5} aria-hidden="true" />
        Kembali ke Kategori
      </Link>

      <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-1.5">
        Kategori
      </span>
      <h1 className="text-2xl font-light text-[#1A1A1A] tracking-tight mb-1.5">
        Tambah Kategori
      </h1>

      <p className="text-xs text-[#999999] font-light mb-7">
        URL kategori dibuat otomatis dari nama dan tidak berubah saat kategori
        disimpan ulang.
      </p>

      <CategoryForm mode="create" initialValues={{ name: '', slug: '', description: '', imageUrl: '', sortOrder: 0, isActive: true }} />
    </main>
  )
}