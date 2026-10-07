import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { getAdminCategoryById } from '@/lib/data/admin/categories'
import CategoryForm from '../../Form'

export const metadata: Metadata = {
  title: 'Edit Kategori',
}

interface CategoryEditPageProps {
  params: Promise<{ id: string }>
}

export default async function CategoryEditPage({
  params,
}: CategoryEditPageProps) {
  const { id } = await params
  const catId = Number(id)

  if (!Number.isInteger(catId) || catId <= 0) {
    notFound()
  }

  const data = await getAdminCategoryById(catId)
  if (!data) {
    notFound()
  }

  return (
    <main className="p-6 sm:p-8 max-w-4xl mx-auto">
      <Link
        href="/admin/kategori"
        className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#666666] hover:text-[#1A1A1A] transition-colors font-medium mb-5"
      >
        <ArrowLeft size={12} strokeWidth={1.5} aria-hidden="true" /> Kembali ke Kategori
      </Link>

      <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-1.5">
        Kategori
      </span>
      <h1 className="text-2xl font-light text-[#1A1A1A] tracking-tight mb-1.5">
        Edit Kategori
      </h1>

      <CategoryForm
        mode="edit"
        initialValues={{
          id: data.id,
          name: data.name,
          slug: data.slug,
          description: data.description ?? '',
          imageUrl: data.imageUrl ?? '',
          sortOrder: data.sortOrder,
          isActive: data.isActive,
        }}
      />
    </main>
  )
}