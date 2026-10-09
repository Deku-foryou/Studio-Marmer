'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Plus, X } from 'lucide-react';

import GalleryImageUploader from './GalleryImageUploader';
import {
  createGalleryItem,
  updateGalleryItem,
  type GalleryActionResult,
} from './actions';
import { ADMIN_TOASTS, buildFlashHref } from '@/lib/admin/toast';
import { useToast } from '@/components/admin/ToastProvider';

/**
 * Gallery create/edit form — Client Component.
 *
 * Uncontrolled, like CategoryForm: each field renders its initial value through
 * `defaultValue` and the browser collects the submission, so there is no per-field
 * state to synchronise with the action result.
 *
 * Prisma is never imported here. Validation lives in the server action; the
 * `required`/`type` attributes below are usability aids only.
 *
 * SUCCESS
 * A successful save produces no inline banner. The form navigates to the list
 * carrying a `?toast=` key that the layout-level listener turns into the
 * notification — that is the same mechanism the category form uses, and the
 * reason the wording cannot drift between the two.
 *
 * When the action reports that the photograph itself changed, a second toast
 * explains that the previous Cloudinary asset was kept. It is additive, so it
 * never replaces the success message.
 */

interface GalleryFormProps {
  mode: 'create' | 'edit';
  initialValues: {
    /** Required in edit mode — the primary key the update targets. */
    id?: number;
    title: string;
    description: string;
    imageUrl: string;
    /** Cloudinary asset id behind imageUrl, when there is one. */
    publicId: string;
    altText: string;
    sortOrder: number;
    isActive: boolean;
  };
}

const INITIAL_STATE: GalleryActionResult = { success: false, error: '' };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-3 text-[11px] uppercase tracking-[0.14em] font-medium hover:bg-[#333333] transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        <>
          <Loader2 size={13} className="animate-spin" aria-hidden="true" />
          Menyimpan...
        </>
      ) : (
        <>
          <Plus size={12} strokeWidth={1.5} aria-hidden="true" />
          {label}
        </>
      )}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-[10px] text-[#C4553D] leading-relaxed">{message}</p>
  );
}

export default function GalleryForm({ mode, initialValues }: GalleryFormProps) {
  const isEdit = mode === 'edit';
  const router = useRouter();
  const { notify } = useToast();

  // Both modes return to the list so the admin sees the result reflected in the
  // table straight away. The ref keeps the navigation to once per successful
  // submission without spending an extra render pass on a flag.
  const hasRedirected = useRef(false);

  // The id travels as a hidden field rather than a bound argument, so both modes
  // submit through one unbound action signature.
  const action = isEdit ? updateGalleryItem : createGalleryItem;

  const [state, formAction] = useActionState<GalleryActionResult, FormData>(
    action,
    INITIAL_STATE
  );

  useEffect(() => {
    if (!state.success || hasRedirected.current) return;

    hasRedirected.current = true;

    /*
     * The replacement notice is raised here rather than appended to the URL: the
     * list page is about to be the destination, and two keys cannot travel in one
     * `toast` param. The provider lives in the dashboard layout, so it survives
     * the navigation and the message is not lost.
     */
    if (state.data.imageReplaced) {
      notify(ADMIN_TOASTS['foto-galeri-diperbarui']);
    }

    /*
     * The success notification rides along in the URL rather than being pushed
     * from here. This effect fires once and the form then navigates away, so a
     * toast raised at that moment would race the teardown — and on a hard
     * navigation the whole client tree, including the toast provider, is replaced
     * anyway. Putting the key in the target URL means the destination page's
     * `ToastFlashListener` raises it after the provider is definitely mounted,
     * whether the navigation is soft or full.
     */
    router.replace(
      buildFlashHref(
        '/admin/galeri',
        isEdit ? 'galeri-diperbarui' : 'galeri-ditambahkan'
      )
    );
    router.refresh();
  }, [state, router, isEdit, notify]);

  const failedField = state.success ? undefined : state.field;
  const showErrorBanner = !state.success && state.error !== '';

  return (
    <div className="p-6 bg-white rounded border border-gray-200">
      <h2 className="text-[10px] uppercase tracking-widest text-[#666666] mb-4">
        {isEdit ? 'Edit Foto Galeri' : 'Tambah Foto Galeri'}
      </h2>

      {showErrorBanner && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2.5 border border-[#C4553D]/40 bg-[#C4553D]/5 px-4 py-3 mb-4"
        >
          <AlertCircle
            size={15}
            className="text-[#C4553D] mt-0.5 flex-shrink-0"
            aria-hidden="true"
          />
          <p className="text-xs text-[#C4553D] leading-relaxed">{state.error}</p>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={initialValues.id ?? 0} />}

        <div>
          <label
            htmlFor="title"
            className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
          >
            Judul foto *
          </label>
          <input
            id="title"
            type="text"
            name="title"
            required
            maxLength={160}
            defaultValue={initialValues.title}
            placeholder="Contoh: Nampan marmer Carrara"
            className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
            aria-invalid={failedField === 'title'}
          />
          <FieldError
            message={failedField === 'title' && !state.success ? state.error : undefined}
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
          >
            Deskripsi (opsional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={2000}
            defaultValue={initialValues.description}
            placeholder="Catatan internal tentang foto ini"
            className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light resize-y"
            aria-invalid={failedField === 'description'}
          />
          <FieldError
            message={
              failedField === 'description' && !state.success ? state.error : undefined
            }
          />
        </div>

        {/* Uploaded from the browser straight to Cloudinary; the uploader writes
            imageUrl + publicId into hidden fields, so there is no manual URL
            input to mistype and no secret on the server. */}
        <GalleryImageUploader
          initialImageUrl={initialValues.imageUrl}
          initialPublicId={initialValues.publicId}
          previewAlt={
            initialValues.altText || initialValues.title || 'Pratinjau foto galeri'
          }
          fieldError={
            failedField === 'imageUrl' && !state.success ? state.error : undefined
          }
        />

        <div>
          <label
            htmlFor="altText"
            className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
          >
            Teks alternatif
          </label>
          <input
            id="altText"
            type="text"
            name="altText"
            maxLength={255}
            defaultValue={initialValues.altText}
            placeholder="Deskripsi singkat isi foto untuk pembaca layar"
            className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
            aria-invalid={failedField === 'altText'}
          />
          <FieldError
            message={failedField === 'altText' && !state.success ? state.error : undefined}
          />
          <p className="mt-1.5 text-[10px] text-[#999999] font-light">
            Dikosongkan berarti halaman publik memakai judul foto sebagai teks
            alternatif.
          </p>
        </div>

        <div>
          <label
            htmlFor="sortOrder"
            className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
          >
            Urutan
          </label>
          <input
            id="sortOrder"
            type="number"
            name="sortOrder"
            min={0}
            step={1}
            defaultValue={String(initialValues.sortOrder)}
            className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
            aria-invalid={failedField === 'sortOrder'}
          />
          <FieldError
            message={failedField === 'sortOrder' && !state.success ? state.error : undefined}
          />
          <p className="mt-1.5 text-[10px] text-[#999999] font-light">
            Angka kecil tampil lebih dulu di halaman galeri. Foto dengan urutan
            sama diurutkan sesuai waktu dibuat.
          </p>
        </div>

        <div>
          <label
            htmlFor="isActive"
            className="flex items-start gap-2.5 cursor-pointer"
          >
            <input
              id="isActive"
              type="checkbox"
              name="isActive"
              defaultChecked={initialValues.isActive}
              className="mt-0.5 w-4 h-4 accent-[#1A1A1A] rounded border"
            />
            <span>
              <span className="block text-[12px] text-[#1A1A1A] font-medium">
                Aktif
              </span>
              <span className="block text-[10px] text-[#999999] font-light">
                Foto nonaktif disembunyikan dari halaman galeri pelanggan.
              </span>
            </span>
          </label>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <SubmitButton label={isEdit ? 'Simpan Perubahan' : 'Simpan'} />
          <Link
            href="/admin/galeri"
            className="inline-flex items-center gap-2 border border-[#E5E1DA] px-6 py-3 text-[11px] uppercase tracking-[0.14em] text-[#1A1A1A] hover:bg-[#FBF9F6] transition-colors"
          >
            <X size={12} strokeWidth={1.5} aria-hidden="true" /> Batal
          </Link>
        </div>
      </form>
    </div>
  );
}