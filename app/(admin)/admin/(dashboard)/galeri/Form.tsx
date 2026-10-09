'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
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
import { useFieldEpoch } from '@/components/admin/useFieldEpoch';
import { useToast } from '@/components/admin/ToastProvider';

/**
 * Gallery create/edit form — Client Component.
 *
 * Prisma is never imported here. Validation lives in the server action; the
 * `required`/`type` attributes below are usability aids only.
 *
 * WHY THE FIELDS ARE CONTROLLED
 * React 19 resets every form control to its `defaultValue` once a Server Action
 * completes — the reset runs before the action is invoked, so it fires on a
 * rejected submission exactly as on a successful one. Driven by `defaultValue`
 * alone, a failed save silently reverted to the server-rendered values and threw
 * away the admin's typing. These fields hold their value in React state instead.
 *
 * `useFieldEpoch` covers the checkbox, whose `defaultChecked` React does not
 * refresh on re-render; keying it on the epoch remounts it from state.
 *
 * SUCCESS
 * A successful save produces no inline banner. The form navigates to the list
 * carrying a `?toast=` key that the layout-level listener turns into the
 * notification — the same mechanism the category form uses, and the reason the
 * wording cannot drift between the two.
 *
 * When the action reports that the photograph itself changed, a second toast
 * explains that the previous Cloudinary asset was kept. It is additive, so it
 * never replaces the success message.
 *
 * FAILURE
 * Nothing navigates and nothing is reset: the typed values stay on screen, the
 * rejected field gets its inline message, and an error toast is raised on the
 * shared queue. The uploaded photograph is untouched either way — the uploader
 * keeps its own state, and the hidden url/publicId fields re-submit it, so
 * fixing a text field never costs a re-upload.
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

/** The editable fields, held together so a failure restores all of them at once. */
interface GalleryFormValues {
  title: string;
  description: string;
  altText: string;
  sortOrder: string;
  isActive: boolean;
}

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

  /*
   * Field state, seeded once from the row being edited. Lazy on purpose: re-seeding
   * from props in an effect would overwrite in-progress typing whenever the action
   * result changed.
   */
  const [values, setValues] = useState<GalleryFormValues>(() => ({
    title: initialValues.title,
    description: initialValues.description,
    altText: initialValues.altText,
    sortOrder: String(initialValues.sortOrder),
    isActive: initialValues.isActive,
  }));

  const setValue = <K extends keyof GalleryFormValues>(
    key: K,
    value: GalleryFormValues[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

// Both modes return to the list so the admin sees the result reflected in the
  // table straight away. The ref keeps the navigation to once per successful
  // submission without spending an extra render pass on a flag.
  const hasRedirected = useRef(false);

  /*
   * Tracks the exact state object last handled so each result raises its
   * notification once. `useActionState` holds its state until the next submit, so a
   * status check alone would re-fire on every unrelated re-render.
   */
  const handledState = useRef<GalleryActionResult | null>(null);

  // The id travels as a hidden field rather than a bound argument, so both modes
  // submit through one unbound action signature.
  const action = isEdit ? updateGalleryItem : createGalleryItem;

  const [state, formAction] = useActionState<GalleryActionResult, FormData>(
    action,
    INITIAL_STATE
  );

  // Advances once per action result; see the note in ProductForm for why the
  // checkbox is keyed on it.
  const epoch = useFieldEpoch(state, INITIAL_STATE);

  useEffect(() => {
    if (handledState.current === state) return;

    handledState.current = state;

    if (!state.success) {
      /*
       * A failure raises an error toast and nothing else. No navigation happens
       * here, which is precisely what keeps the typed values and the uploaded
       * photograph on screen for the retry.
       */
      if (state.error) notify({ tone: 'error', message: state.error });
      return;
    }

    if (hasRedirected.current) return;

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
            value={values.title}
            onChange={(e) => setValue('title', e.target.value)}
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
            value={values.description}
            onChange={(e) => setValue('description', e.target.value)}
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
            value={values.altText}
            onChange={(e) => setValue('altText', e.target.value)}
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
            value={values.sortOrder}
            onChange={(e) => setValue('sortOrder', e.target.value)}
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
            {/*
              Keyed on the epoch so the post-action form reset cannot un-tick what
              the admin just set: React refreshes `checked` on render but leaves
              `defaultChecked` at its mount-time value.
            */}
            <input
              key={`isActive-${epoch}`}
              id="isActive"
              type="checkbox"
              name="isActive"
              checked={values.isActive}
              onChange={(e) => setValue('isActive', e.target.checked)}
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