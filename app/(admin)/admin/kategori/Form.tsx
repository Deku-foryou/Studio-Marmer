'use client'

import { useState, useActionState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { Plus, Trash2, X } from 'lucide-react'

import { createCategorySchema, updateCategorySchema } from '@/lib/validation/category'
import { createCategory, updateCategory, deleteCategory } from '@/app/(admin)/admin/kategori/actions'

interface CategoryFormProps {
  mode: 'create' | 'edit'
  initialValues: {
    name: string
    slug: string
    description: string
    imageUrl: string
    sortOrder: number
    isActive: boolean
  } & { id?: number }
  onSuccess?: () => void
}

export default function CategoryForm({
  mode,
  initialValues,
  onSuccess,
}: CategoryFormProps) {
  const [state, formAction] = useActionState(
    async (prev: any, formData: FormData) => {
      if (mode === 'create') {
        return await createCategory(formData)
      } else {
        return await updateCategory(initialValues.id ?? 0, formData)
      }
    },
    { success: false, error: '' }
  )

  const router = useRouter()

  // Build form values from initialValues
  const formValues = {
    name: initialValues.name,
    description: initialValues.description,
    imageUrl: initialValues.imageUrl,
    sortOrder: String(initialValues.sortOrder),
    isActive: initialValues.isActive ? 'on' : undefined,
  }

  // Determine button label
  const buttonLabel = mode === 'create' ? 'Simpan' : 'Simpan Perubahan'

  // Determine form title
  const title = mode === 'create' ? 'Tambah Kategori' : 'Edit Kategori'

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    formAction(formDataFromValues(formValues))
  }

  // Redirect after success
  if (state.success) {
    router.push('/admin/kategori')
    if (onSuccess) onSuccess()
    return null
  }

  // Check if form has errors
  const hasError = state.success === false && state.error !== ''

  // Render error banner if there's an error
  let errorBanner = null
  if (hasError) {
    errorBanner = (
      <div className="p-6 bg-red-50 border border-red-200 rounded">
        <p className="text-red-600">{state.error}</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded border border-gray-200">
      <h2 className="text-[10px] uppercase tracking-widest text-[#666666] mb-4">
        {mode === 'create' ? 'Tambah Kategori' : 'Edit Kategori'}
      </h2>

      {errorBanner}

      <form onSubmit={handleSubmit} action={formAction}>
        <div className="mb-4">
          <label className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5">
            Nama kategori *
          </label>
          <input
            type="text"
            name="name"
            required
            value={formValues.name}
            className="w-full border border-[#E5E1DA] focus-border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
            placeholder="Nama kategori"
          />
        </div>

        <div className="mb-4">
          <label className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5">
            Deskripsi (opsional)
          </label>
          <input
            type="text"
            name="description"
            value={formValues.description}
            className="w-full border border-[#E5E1DA] focus-border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
            placeholder="Deskripsi kategori"
          />
        </div>

        <div className="mb-4">
          <label className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5">
            URL gambar (opsional)
          </label>
          <input
            type="text"
            name="imageUrl"
            value={formValues.imageUrl}
            className="w-full border border-[#E5E1DA] focus-border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
            placeholder="https://shopee.co.id/... atau /placeholders/..."
          />
        </div>

        <div className="mb-4">
          <label className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5">
            Urutan
          </label>
          <input
            type="number"
            name="sortOrder"
            min="0"
            step="1"
            value={formValues.sortOrder}
            className="w-full border border-border-border-[#E5E1DA] focus-border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
          />
        </div>

        <div className="mb-4">
          <label className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5">
            Aktif
          </label>
          <input
            type="checkbox"
            name="isActive"
            checked={formValues.isActive === 'on'}
            className="w-4 h-4 accent-[#1A1A1A] rounded border"
          />
        </div>

        {mode === 'edit' && (
          <p className="text-xs text-muted-foreground mt-3">
            Slug akan tetap sama (dibuat dari nama pertama kali).
          </p>
        )}

        <div className="mt-6">
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-3 text-[11px] uppercase tracking-[0.14em] font-medium hover:bg-[#333333] transition-colors">
            <Plus size={12} strokeWidth={1.5} aria-hidden="true" /> {buttonLabel}
          </button>
          <a
            href="/admin/kategori"
            className="inline-flex items-center gap-2 border border-[#E5E1DA] px-6 py-3 text-[11px] uppercase tracking-[0.14em] text-[#1A1A1A] hover:bg-white transition-colors">
            <X size={12} strokeWidth={1.5} aria-hidden="true" /> Batal
          </a>
        </div>
      </form>
    </div>
  )
}

function formDataFromValues(values: any) {
  const fd = new FormData()
  fd.append('name', values.name)
  fd.append('description', values.description)
  fd.append('imageUrl', values.imageUrl)
  fd.append('sortOrder', values.sortOrder)
  fd.append('isActive', values.isActive ? 'on' : '')
  return fd
}