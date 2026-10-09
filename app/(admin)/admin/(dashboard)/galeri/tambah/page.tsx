import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import GalleryForm from '../Form';

export const metadata: Metadata = {
  title: 'Tambah Foto Galeri',
};

export default async function GalleryTambahPage() {
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
        Tambah Foto
      </h1>

      <p className="text-xs text-[#999999] font-light mb-7">
        Foto diunggah langsung ke Cloudinary. Simpan dulu dalam status nonaktif bila
        foto belum siap tayang.
      </p>

      <GalleryForm
        mode="create"
        initialValues={{
          title: '',
          description: '',
          imageUrl: '',
          publicId: '',
          altText: '',
          sortOrder: 0,
          isActive: true,
        }}
      />
    </main>
  );
}