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
 * Single-image Cloudinary uploader for the site-wide images in /admin/pengaturan.
 *
 * Reuses the exact mechanism as the product gallery and the category uploader —
 * `lib/cloudinary-upload.ts`, an unsigned preset, a browser-to-Cloudinary POST —
 * so no image bytes ever touch this app and no secret is involved. The only
 * difference is the folder: site assets land in `studio-marmer/site` rather than
 * alongside product or category photography, which is what keeps the media
 * library legible as those three content types grow.
 *
 * ONE COMPONENT, TWO SLOTS
 * The logo and the hero photograph differ only in field names, label and crop,
 * so generalising them into one slot component is cheaper than maintaining two
 * near-identical files. The `fieldPrefix` decides which hidden inputs are
 * written, which is what lets the surrounding form treat both images as ordinary
 * submitted values and re-validate them server-side.
 *
 * HIDDEN FIELDS CARRY THE VALUE
 * The uploaded result is written into hidden inputs that are always present, so
 * "unchanged" and "removed" are both expressible as plain form data: an untouched
 * image re-submits its own current url/publicId, and a removed one submits two
 * empty strings. That is what lets an admin edit the WhatsApp number without
 * having to re-pick the logo.
 *
 * The Cloudinary asset itself is never deleted here. Removing an image only
 * unlinks it from the database; deleting remote media needs a trusted
 * server-side context this codebase deliberately does not have yet, and losing
 * an asset the admin may still want is worse than leaving one unreferenced.
 */

interface SiteImageUploaderProps {
  /** Prefix for the hidden inputs, e.g. `logo` -> `logoUrl` + `logoPublicId`. */
  fieldPrefix: 'logo' | 'heroImage';
  /** Input id; also the label's `htmlFor`. Must be unique per instance. */
  inputId: string;
  /** Field label shown above the picker. */
  label: string;
  /** Guidance line under the label. */
  hint?: string;
  /** Accessible alt text for the preview image. */
  previewAlt: string;
  initialImageUrl?: string | null;
  initialPublicId?: string | null;
  fieldError?: string;
  /**
   * `wide` previews the hero photograph, which is landscape and reads better in
   * a full-width frame. The default square-ish frame suits the logo.
   */
  previewShape?: 'logo' | 'wide';
}

type Uploaded = { imageUrl: string; publicId: string; fileName: string };

export default function SiteImageUploader({
  fieldPrefix,
  inputId,
  label,
  hint,
  previewAlt,
  initialImageUrl,
  initialPublicId,
  fieldError,
  previewShape = 'logo',
}: SiteImageUploaderProps) {
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
        CLOUDINARY_FOLDERS.site
      );
      // A replacement always wins, and the previous asset's public id is dropped
      // with it so the pair written to the database always describes one and the
      // same asset.
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

      /*
       * Also raised as a toast.
       *
       * The inline message stays — it sits directly under the picker, which is
       * where the admin's eye already is, and it carries the specific reason
       * ("melebihi 5 MB", "format tidak didukung"). The toast is the second
       * channel, for the case where the failure happened below the fold or the
       * admin had scrolled away from this section; without it a failed upload on
       * a long settings page can look like nothing happened at all.
       *
       * Same wording as the inline copy, so the two can never disagree.
       */
      notify({ tone: 'error', message });
    } finally {
      setIsUploading(false);
      // Reset so re-picking the same file still fires onChange.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <label htmlFor={inputId} className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5">
        {label}
      </label>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={IMAGE_INPUT_ACCEPT}
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {/* ─── Preview ─────────────────────────────────────────────── */}
      {image && !isUploading && (
        <div className="border border-[#E5E1DA] p-3">
          <div
            className={cn(
              'relative w-full border border-[#E5E1DA] bg-[#F3F1EE] overflow-hidden',
              previewShape === 'wide' ? 'h-36 sm:h-44' : 'sm:w-40 h-28'
            )}
          >
            <Image
              src={image.imageUrl}
              alt={previewAlt}
              fill
              sizes={previewShape === 'wide' ? '(max-width: 640px) 100vw, 600px' : '160px'}
              className={previewShape === 'wide' ? 'object-cover' : 'object-contain'}
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
              aria-label={`Hapus ${label.toLowerCase()}`}
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
        {hint ??
          `JPG, PNG, atau WEBP, maksimal ${Math.round(
            MAX_IMAGE_BYTES / (1024 * 1024)
          )} MB. Menghapus gambar hanya melepas-tautan di sini; file Cloudinary tidak dihapus otomatis.`}
      </p>
      {hint && (
        <p className="mt-1 text-[9px] text-[#C9C4BC]">
          JPG, PNG, atau WEBP, maksimal{' '}
          {Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB. Menghapus gambar hanya
          melepas-tautkan di sini; file Cloudinary tidak dihapus otomatis.
        </p>
      )}

      {/* ─── Submitted values ───────────────────────────────────── */}
      <input
        type="hidden"
        name={`${fieldPrefix}Url`}
        value={image?.imageUrl ?? ''}
      />
      <input
        type="hidden"
        name={`${fieldPrefix}PublicId`}
        value={image?.publicId ?? ''}
      />
    </div>
  );
}
