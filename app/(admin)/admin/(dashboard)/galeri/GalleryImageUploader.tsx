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
import { useToast } from '@/components/admin/ToastProvider';

/**
 * Single-image Cloudinary uploader for a gallery photograph.
 *
 * Same mechanism as CategoryImageUploader and SiteImageUploader — one unsigned
 * preset, a browser-to-Cloudinary POST, and only `secure_url` + `public_id` ever
 * reaching the database. No image bytes touch this app and no secret is involved.
 * The only difference is the folder: gallery assets land in
 * `studio-marmer/gallery`, which keeps the media library legible as this module
 * grows alongside products, categories and site media.
 *
 * WHY THE HIDDEN FIELDS MATTER
 * The result is written into always-present hidden inputs, so "unchanged" and
 * "replaced" are both plain form data. An untouched photo re-submits its own
 * url/publicId, which is what lets an admin retitle a photo without re-picking
 * the file.
 *
 * REMOVING A PHOTO IS NOT THE SAME AS DELETING AN ITEM
 * "Hapus" here only clears the reference from the form. A gallery row with no
 * photograph would be a broken tile, so the server rejects that submission
 * (see requiredMediaUrl in lib/validation/gallery.ts) and the admin is asked to
 * delete the item from the list instead. The Cloudinary asset itself is never
 * deleted from here — that is a separate, server-side concern.
 */

interface GalleryImageUploaderProps {
  initialImageUrl?: string | null;
  initialPublicId?: string | null;
  /** Accessible text for the preview image itself. */
  previewAlt: string;
  fieldError?: string;
}

type Uploaded = { imageUrl: string; publicId: string; fileName: string };

export default function GalleryImageUploader({
  initialImageUrl,
  initialPublicId,
  previewAlt,
  fieldError,
}: GalleryImageUploaderProps) {
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
  const { notify } = useToast();

  const handleFiles = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const uploaded = await uploadProductImage(
        file,
        CLOUDINARY_FOLDERS.gallery
      );
      // A replacement always wins, and the previous asset's public id goes with it
      // so the pair stored in the database always describes one and the same
      // asset.
      setImage({
        imageUrl: uploaded.imageUrl,
        publicId: uploaded.publicId,
        fileName: uploaded.fileName,
      });
    } catch (uploadError) {
      const message =
        uploadError instanceof ImageUploadError
          ? uploadError.message
          : 'Unggah gambar gagal. Silakan coba lagi.';

      setError(message);
      // Raised as a toast as well as inline: same wording, two channels, so a
      // failure is never mistaken for a control that did nothing.
      notify({ tone: 'error', message });
    } finally {
      setIsUploading(false);
      // Reset so re-picking the same file still fires onChange.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <span className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5">
        Foto *
      </span>

      <input
        ref={inputRef}
        id="gallery-image-input"
        type="file"
        accept={IMAGE_INPUT_ACCEPT}
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {/* ─── Preview ─────────────────────────────────────────────── */}
      {image && !isUploading && (
        <div className="border border-[#E5E1DA] p-3">
          <div className="relative w-full sm:w-56 h-40 border border-[#E5E1DA] bg-[#F3F1EE] overflow-hidden">
            <Image
              src={image.imageUrl}
              alt={previewAlt}
              fill
              sizes="224px"
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
              aria-label="Lepas foto galeri"
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[#999999] hover:text-[#C4553D] transition-colors"
            >
              <Trash2 size={11} strokeWidth={1.5} aria-hidden="true" />
              Lepas
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

      <p className="mt-2 text-[9px] text-[#C9C4BC] leading-relaxed">
        JPG, PNG, atau WEBP, maksimal {Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}{' '}
        MB. Melepas foto hanya mengosongkan kolom di bawah — simpan tetap butuh
        foto, jadi hapus itemnya dari daftar bila foto memang tidak dipakai lagi.
        File Cloudinary tidak dihapus otomatis.
      </p>

      {/* ─── Submitted values ───────────────────────────────────── */}
      <input type="hidden" name="imageUrl" value={image?.imageUrl ?? ''} />
      <input type="hidden" name="publicId" value={image?.publicId ?? ''} />
    </div>
  );
}