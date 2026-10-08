'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import {
  CLOUDINARY_FOLDERS,
  ImageUploadError,
  IMAGE_INPUT_ACCEPT,
  MAX_IMAGE_BYTES,
  uploadProductImage,
} from '@/lib/cloudinary-upload';
import { cn } from '@/lib/utils';

/**
 * Single-image Cloudinary uploader for admin category images.
 *
 * Reuses the same `lib/cloudinary-upload.ts` mechanism as the product gallery —
 * an unsigned preset, a browser-to-Cloudinary POST, and only `secure_url` +
 * `public_id` ever reaching the database. No image bytes touch this app, and no
 * secret is involved.
 *
 * It differs from `ProductImageUploader` in scope, not in mechanism: a category
 * has at most one photo and no ordering or alt-text, so this is a single slot
 * rather than a list. Keeping it separate is cheaper than generalising the
 * product component into a multi/single dual-mode component.
 *
 * The uploaded result is written into hidden fields, so the surrounding form
 * submits it like any other value and the server action re-validates it.
 *
 * Removing an image clears both hidden fields. The Cloudinary asset itself is
 * left in place: nothing here deletes remote media, which is a separate,
 * deliberately server-side concern.
 */

interface CategoryImageUploaderProps {
  initialImageUrl?: string | null;
  initialPublicId?: string | null;
  fieldError?: string;
}

type Uploaded = { imageUrl: string; publicId: string; fileName: string };

export default function CategoryImageUploader({
  initialImageUrl,
  initialPublicId,
  fieldError,
}: CategoryImageUploaderProps) {
  const [image, setImage] = useState<Uploaded | null>(
    initialImageUrl
      ? {
          imageUrl: initialImageUrl,
          publicId: initialPublicId ?? '',
          fileName: '',
        }
      : null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const uploaded = await uploadProductImage(
        file,
        CLOUDINARY_FOLDERS.category
      );
      // A replacement always wins, and the previous asset's public id is
      // dropped with it so the pair stored in the database always describes
      // one and the same asset.
      setImage({
        imageUrl: uploaded.imageUrl,
        publicId: uploaded.publicId,
        fileName: uploaded.fileName,
      });
    } catch (uploadError) {
      setError(
        uploadError instanceof ImageUploadError
          ? uploadError.message
          : 'Unggah gambar gagal. Silakan coba lagi.'
      );
    } finally {
      setIsUploading(false);
      // Reset so re-picking the same file still fires onChange.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <span className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5">
        Gambar kategori (opsional)
      </span>

      <input
        ref={inputRef}
        id="category-image-input"
        type="file"
        accept={IMAGE_INPUT_ACCEPT}
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {/* ─── Preview ─────────────────────────────────────────────── */}
      {image && !isUploading && (
        <div className="border border-[#E5E1DA] p-3">
          <div className="relative w-full sm:w-40 h-28 border border-[#E5E1DA] bg-[#F3F1EE] overflow-hidden">
            <Image
              src={image.imageUrl}
              alt={image.fileName || 'Pratinjau gambar kategori'}
              fill
              sizes="160px"
              className="object-cover"
            />
          </div>

          <p className="mt-2 text-[9px] text-[#C9C4BC] truncate">
            {image.fileName || image.publicId || image.imageUrl}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 border border-[#E5E1DA] px-3.5 py-2 text-[10px] uppercase tracking-[0.14em] text-[#1A1A1A] hover:bg-[#FBF9F6] transition-colors"
            >
              <Upload size={11} strokeWidth={1.5} aria-hidden="true" />
              Ganti
            </button>
            <button
              type="button"
              onClick={() => {
                setImage(null);
                setError(null);
              }}
              aria-label="Hapus gambar kategori"
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[#999999] hover:text-[#C4553D] transition-colors"
            >
              <Trash2 size={11} strokeWidth={1.5} aria-hidden="true" />
              Hapus
            </button>
          </div>
        </div>
      )}

      {/* ─── Picker ──────────────────────────────────────────────── */}
      {(!image || isUploading) && (
        <div className="border border-dashed border-[#E5E1DA] bg-[#FBF9F6] p-5 text-center">
          <ImagePlus
            size={18}
            strokeWidth={1.5}
            className="mx-auto text-[#999999] mb-2"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              'inline-flex items-center gap-2 border border-[#E5E1DA] bg-white px-4 py-2.5',
              'text-[10px] uppercase tracking-[0.14em] text-[#1A1A1A]',
              'transition-colors hover:bg-[#1A1A1A] hover:text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-[#1A1A1A]'
            )}
          >
            {isUploading ? (
              <Loader2
                size={12}
                strokeWidth={1.5}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Upload size={12} strokeWidth={1.5} aria-hidden="true" />
            )}
            {isUploading ? 'Mengunggah…' : 'Pilih Gambar'}
          </button>
          {isUploading && (
            <p className="mt-2.5 text-[10px] text-[#666666]">Mengunggah…</p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[10px] text-[#C4553D] leading-relaxed">
          {error}
        </p>
      )}
      {fieldError && (
        <p role="alert" className="mt-2 text-[10px] text-[#C4553D]">
          {fieldError}
        </p>
      )}

      <p className="mt-2 text-[9px] text-[#C9C4BC]">
        JPG, PNG, atau WEBP, maksimal {Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}{' '}
        MB. Menghapus gambar hanya melepas-tautan di sini; file Cloudinary tidak
        dihapus otomatis.
      </p>

      {/* ─── Submitted values ───────────────────────────────────── */}
      <input type="hidden" name="imageUrl" value={image?.imageUrl ?? ''} />
      <input type="hidden" name="publicId" value={image?.publicId ?? ''} />
    </div>
  );
}