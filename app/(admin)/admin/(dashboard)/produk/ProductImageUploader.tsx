'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ImageUploadError,
  IMAGE_INPUT_ACCEPT,
  MAX_IMAGE_BYTES,
  uploadProductImage,
  type UploadedImage,
} from '@/lib/cloudinary-upload';
import { cn } from '@/lib/utils';

/**
 * Product photo uploader — admin only.
 *
 * HOW THE DATA MOVES
 * The admin picks files, each is uploaded to Cloudinary immediately from the
 * browser via an unsigned preset, and only the resulting `secure_url` +
 * `public_id` are held in React state. Those become hidden form fields, so the
 * product is saved with references to remote assets — the image bytes are never
 * uploaded to this application and never touch the local filesystem.
 *
 * Because uploading happens *before* the product is saved, closing the tab
 * mid-edit can leave an asset in Cloudinary that no product references yet.
 * That is deliberate: an unreferenced file costs nothing, whereas deleting an
 * asset before its database row exists would orphan a real photo. Phase 6C-2
 * reconciles those leftovers.
 *
 * ORDER
 * The order of `images` is the gallery order. Move controls re-index the array
 * and the hidden inputs are written from that array, so position 0 is the cover
 * photo. `sortOrder` is assigned server-side from the submitted sequence.
 */

export interface ProductImageDraft {
  imageUrl: string;
  altText: string;
  publicId: string;
  /** Original file name, shown under the preview. */
  fileName: string;
}

interface ProductImageUploaderProps {
  initialImages: readonly ProductImageDraft[];
  fieldError?: string;
}

type PendingUpload = { id: string; fileName: string };

export default function ProductImageUploader({
  initialImages,
  fieldError,
}: ProductImageUploaderProps) {
  /*
   * The draft list is React state, not form state: it is deliberately independent
   * of the surrounding form's reset, because a rejected save must not discard
   * photographs the admin has already uploaded to Cloudinary.
   *
   * That independence is why the alt-text inputs below are controlled as well.
   * An uncontrolled `<input defaultValue>` inside the form is reset by React after
   * every Server Action, which silently discarded typed alt text whenever any other
   * field failed validation.
   */
  const [images, setImages] = useState<ProductImageDraft[]>(() =>
    initialImages.map((image) => ({ ...image }))
  );

  /** Writes alt text for one slot, leaving the image reference untouched. */
  const setAltTextAt = useCallback((index: number, altText: string) => {
    setImages((prev) =>
      prev.map((image, i) => (i === index ? { ...image, altText } : image))
    );
  }, []);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isUploading = pending.length > 0;

  const move = useCallback((index: number, direction: -1 | 1) => {
    setImages((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }, []);

  const removeAt = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const selected = Array.from(fileList);

      /**
       * Skip anything already in the list, comparing by public id for freshly
       * uploaded files and by URL for ones loaded from the database. Picking the
       * same photo twice is almost always accidental, and it would otherwise
       * create a duplicate gallery entry.
       */
      const fresh: UploadedImage[] = [];
      /**
       * Keys already present. A Cloudinary-hosted photo is keyed by its public
       * id, so the same asset re-picked from disk is recognised; an image loaded
       * from the database is keyed by its URL for the same reason.
       */
      const skipped = new Set<string>(
        images.flatMap((image) =>
          image.publicId ? [image.publicId, image.imageUrl] : [image.imageUrl]
        )
      );
      const seen = new Set<string>();

      for (const file of selected) {
        // A cheap local key so two identical picks in one selection collapse.
        const localKey = `${file.name}:${file.size}:${file.lastModified}`;

        // Two guards: `seen` collapses duplicates *within* one selection, while
        // `skipped` blocks re-picking a file that is already in the gallery.
        if (seen.has(localKey) || skipped.has(localKey)) continue;
        seen.add(localKey);

        setError(null);
        setPending((prev) => [
          ...prev,
          { id: `${localKey}#${fresh.length}`, fileName: file.name },
        ]);

        try {
          const uploaded = await uploadProductImage(file);
          fresh.push(uploaded);
        } catch (uploadError) {
          setError(
            uploadError instanceof ImageUploadError
              ? uploadError.message
              : 'Unggah foto gagal. Silakan coba lagi.'
          );
        } finally {
          setPending((prev) => prev.slice(1));
        }
      }

      if (fresh.length > 0) {
        setImages((prev) => [
          ...prev,
          ...fresh.map((uploaded) => ({
            imageUrl: uploaded.imageUrl,
            publicId: uploaded.publicId,
            altText: '',
            fileName: uploaded.fileName,
          })),
        ]);
      }

      // Reset the control so re-picking the same file still fires onChange.
      if (inputRef.current) inputRef.current.value = '';
    },
    [images]
  );

  return (
    <section className="border border-[#E5E1DA] bg-white p-5 sm:p-6">
      <h3 className="text-[10px] uppercase tracking-[0.18em] text-[#1A1A1A] font-semibold mb-3">
        Upload Foto Produk
      </h3>

      <p className="text-[10px] text-[#999999] font-light leading-relaxed mb-4">
        Unggah foto langsung ke Cloudinary. Format JPG, PNG, atau WEBP, maksimal
        5 MB per foto. Produk dapat disimpan tanpa foto.
      </p>

      {/* ─── Dropzone / picker ──────────────────────────────────── */}
      <div className="border border-dashed border-[#E5E1DA] bg-[#FBF9F6] p-5 text-center">
        <ImagePlus
          size={20}
          strokeWidth={1.5}
          className="mx-auto text-[#999999] mb-2"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id="product-images-input"
          type="file"
          accept={IMAGE_INPUT_ACCEPT}
          multiple
          className="sr-only"
          onChange={(e) => void handleFiles(e.target.files)}
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
          {isUploading ? 'Mengunggah…' : 'Tambah Foto'}
        </button>

        {isUploading && (
          <ul className="mt-3 space-y-1">
            {pending.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-center gap-2 text-[10px] text-[#666666]"
              >
                <Loader2
                  size={11}
                  strokeWidth={1.5}
                  className="animate-spin text-[#8B7355]"
                  aria-hidden="true"
                />
                Mengunggah {item.fileName}…
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ─── Errors ──────────────────────────────────────────────── */}
      {error && (
        <p
          role="alert"
          className="mt-3 text-[11px] text-[#C4553D] leading-relaxed"
        >
          {error}
        </p>
      )}
      {fieldError && (
        <p role="alert" className="mt-3 text-[11px] text-[#C4553D]">
          {fieldError}
        </p>
      )}

      {/* ─── Previews ────────────────────────────────────────────── */}
      {images.length > 0 && (
        <ul className="mt-5 space-y-3">
          {images.map((image, index) => (
            <li
              key={image.publicId || image.imageUrl || index}
              className="flex flex-col sm:flex-row gap-3 border border-[#E5E1DA] p-3"
            >
              <div className="relative w-full sm:w-28 h-20 shrink-0 border border-[#E5E1DA] bg-[#F3F1EE] overflow-hidden">
                <Image
                  src={image.imageUrl}
                  alt={image.altText || `Pratinjau foto ${index + 1}`}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
                {index === 0 && (
                  <span className="absolute top-1 left-1 bg-[#1A1A1A]/85 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.14em] text-white">
                    Sampul
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <label
                  htmlFor={`image_${index}_alt`}
                  className="block text-[9px] uppercase tracking-[0.14em] text-[#999999] font-medium mb-1"
                >
                  Teks Alternatif
                </label>
                <input
                  id={`image_${index}_alt`}
                  type="text"
                  name={`image_${index}_alt`}
                  value={image.altText}
                  onChange={(e) => setAltTextAt(index, e.target.value)}
                  placeholder="Deskripsi singkat foto"
                  className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
                />
                <p className="mt-1.5 text-[9px] text-[#C9C4BC] truncate">
                  {image.fileName || image.publicId || image.imageUrl}
                </p>

                {/* These carry the uploaded result to the server action. */}
                <input
                  type="hidden"
                  name={`image_${index}_url`}
                  value={image.imageUrl}
                />
                <input
                  type="hidden"
                  name={`image_${index}_publicId`}
                  value={image.publicId}
                />
              </div>

              <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Geser foto ${index + 1} ke atas`}
                    className="p-1.5 border border-[#E5E1DA] text-[#666666] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[#E5E1DA] disabled:hover:text-[#666666]"
                  >
                    <ArrowUp size={12} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === images.length - 1}
                    aria-label={`Geser foto ${index + 1} ke bawah`}
                    className="p-1.5 border border-[#E5E1DA] text-[#666666] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[#E5E1DA] disabled:hover:text-[#666666]"
                  >
                    <ArrowDown size={12} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  aria-label={`Hapus foto ${index + 1}`}
                  className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[#999999] hover:text-[#C4553D] transition-colors"
                >
                  <Trash2 size={11} strokeWidth={1.5} aria-hidden="true" />
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[9px] text-[#C9C4BC]">
        Maksimal {Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB per foto. Foto
        pertama menjadi foto sampul. Asset yang dihapus dari daftar hanya
        melepas-tautan di sini; penghapusan file Cloudinary dilakukan terpisah.
      </p>
    </section>
  );
}