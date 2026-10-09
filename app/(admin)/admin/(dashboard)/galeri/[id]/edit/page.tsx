import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { getAdminGalleryItemById } from '@/lib/data/admin/gallery';
import GalleryForm from '../../Form';

export const metadata: Metadata = {
  title: 'Edit Foto Galeri',
};

interface GalleryEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function GalleryEditPage({ params }: GalleryEditPageProps) {
  const { id } = await params;
  const itemId = Number(id);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    notFound();
  }

  const data = await getAdminGalleryItemById(itemId);

  if (!data) {
    notFound();
  }

  return (
    <main className="p-6 sm:p-8 max-w-4xl mx-auto">
      <Link
        href="/admin/galeri"
        className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#666666] hover:text-[#1A1A1A] transition-colors font-medium mb-5"
      >
        <ArrowLeft size={12} strokeWidth={1.5} aria-hidden="true" />
        Kembali ke Galeri
      </Link>

      <span className="text-[10px] uppercase tracking-[0.24em] text-[#8B7355] font-medium block mb-1.5">
        Galeri
      </span>
      <h1 className="text-2xl font-light text-[#1A1A1A] tracking-tight mb-1.5">
        Edit Foto
      </h1>

      <p className="text-xs text-[#999999] font-light mb-7">
        Mengubah judul, deskripsi, atau teks alternatif tidak menyentuh foto yang
        sudah tersimpan.
      </p>

      <GalleryForm
        mode="edit"
        initialValues={{
          id: data.id,
          title: data.title,
          description: data.description ?? '',
          // Re-submitting these unchanged is what keeps the existing photograph
          // when only the metadata is edited.
          imageUrl: data.imageUrl,
          publicId: data.publicId ?? '',
          altText: data.altText ?? '',
          sortOrder: data.sortOrder,
          isActive: data.isActive,
        }}
      />
    </main>
  );
}