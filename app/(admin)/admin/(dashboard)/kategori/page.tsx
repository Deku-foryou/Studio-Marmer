import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { notFound } from 'next/navigation'
import { Plus } from 'lucide-react'

import { listAdminCategories } from '@/lib/data/admin/categories'
import CategoryForm from './Form'

export const metadata = {
  title: 'Kategori',
}

export default async function CategoryPage() {
  const { categories, total } = await listAdminCategories()

  if (total === 0) {
    return (
      <main className="p-6 sm:p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-light text-[#1A1A1A] tracking-tight mb-4">Daftar Kategori</h1>
        <p className="text-xs text-[#999999] font-light">Tidak ada kategori yang ditemukan.</p>
        <a href="/admin/kategori/tambah" className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-3 text-[11px] uppercase tracking-[0.14em] font-medium hover:bg-[#333333] transition-colors">
          <Plus size={12} strokeWidth={1.5} aria-hidden="true" /> Tambah Kategori
        </a>
      </main>
    )
  }

  return (
    <main className="p-6 sm:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-light text-[#1A1A1A] tracking-tight mb-4">Daftar Kategori</h1>
      <CategoryForm mode="create" initialValues={{ name: '', slug: '', description: '', imageUrl: '', sortOrder: 0, isActive: true }} />
      <div className="mt-6">
        <a href="/admin/kategori/tambah" className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-3 text-[11px] uppercase tracking-[0.14em] font-medium hover:bg-[#333333] transition-colors">
          <Plus size={12} strokeWidth={1.5} aria-hidden="true" /> Tambah Kategori
        </a>
      </div>
    </main>
  )
}