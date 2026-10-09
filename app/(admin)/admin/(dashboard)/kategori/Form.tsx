'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Plus, X } from 'lucide-react';

import CategoryImageUploader from './CategoryImageUploader';
import {
  createCategory,
  updateCategory,
  type CategoryActionResult,
} from './actions';
import { buildFlashHref } from '@/lib/admin/toast';
import { useFieldEpoch } from '@/components/admin/useFieldEpoch';
import { useToast } from '@/components/admin/ToastProvider';

/**
 * Category create/edit form — Client Component.
 *
 * The action result (`CategoryActionResult`) drives the Indonesian error messages
 * plus the single field the server rejected, and `useFormStatus` drives the pending
 * state on the submit button. A successful save produces no inline banner: the form
 * navigates to the list, carrying a `?toast=` key that the layout-level listener
 * turns into the notification.
 *
 * WHY THE FIELDS ARE CONTROLLED
 * React 19 resets every form control to its `defaultValue` once a Server Action
 * completes — the reset runs before the action is even invoked, so it happens on a
 * rejected submission exactly as it does on a successful one. A form built from
 * `defaultValue` alone silently reverted to the values the server-rendered page was
 * built with, discarding everything the admin had typed. The fields below therefore
 * hold their value in React state and write it back each render.
 *
 * `useFieldEpoch` covers the one control type React does not keep in sync for a
 * reset: a checkbox's `checked` is updated on render but its `defaultChecked` is
 * not, so it is keyed on the epoch to be remounted from state.
 *
 * Prisma is never imported here. Validation lives in the server action; the
 * `required`/`type` attributes below are usability aids only.
 */

interface CategoryFormProps {
  mode: 'create' | 'edit';
  initialValues: {
    /** Required in edit mode — the primary key the update targets. */
    id?: number;
    name: string;
    slug: string;
    description: string;
    imageUrl: string;
    /** Cloudinary asset id behind imageUrl, when there is one. */
    publicId: string;
    sortOrder: number;
    isActive: boolean;
  };
}

const INITIAL_STATE: CategoryActionResult = {
  success: false,
  error: '',
};

/** The editable fields, held together so a failure restores all of them at once. */
interface CategoryFormValues {
  name: string;
  description: string;
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

export default function CategoryForm({ mode, initialValues }: CategoryFormProps) {
  const isEdit = mode === 'edit';
  const router = useRouter();
  const { notify } = useToast();

  /*
   * Field state, seeded once from the row being edited. Lazy on purpose: an effect
   * that re-seeded from props would overwrite in-progress typing whenever the
   * action result changed.
   */
  const [values, setValues] = useState<CategoryFormValues>(() => ({
    name: initialValues.name,
    description: initialValues.description,
    sortOrder: String(initialValues.sortOrder),
    isActive: initialValues.isActive,
  }));

  const setValue = <K extends keyof CategoryFormValues>(
    key: K,
    value: CategoryFormValues[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  // Both create and edit return to the list so the admin immediately sees the
  // result reflected in the table. The ref keeps the navigation to once per
  // successful submission without spending an extra render pass on a flag.
  const hasRedirected = useRef(false);

  /*
   * Tracks the exact state object last handled, so a notification is raised once
   * per result. `useActionState` holds its state until the next submit, so a plain
   * status check would re-fire on every unrelated re-render.
   */
  const handledState = useRef<CategoryActionResult | null>(null);

  // The category id travels as a hidden field rather than as a bound argument,
  // so both modes submit through one unbound action signature.
  const action = isEdit ? updateCategory : createCategory;

  const [state, formAction] = useActionState<CategoryActionResult, FormData>(
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
       * A failure is announced on the shared queue as well as inline. Nothing here
       * navigates on a rejected submission — that is deliberate, and is what keeps
       * the admin's input on screen — so the toast is the only notification
       * guaranteed to be visible without hunting for the inline message.
       */
      if (state.error) notify({ tone: 'error', message: state.error });
      return;
    }

    if (hasRedirected.current) return;

    hasRedirected.current = true;
    /*
     * The success notification rides along in the URL rather than being pushed
     * from here.
     *
     * This effect fires once and the form then navigates away, so a toast
     * raised from this component would race the teardown — and on a hard
     * navigation the whole client tree, including the toast provider, is
     * replaced anyway. Putting the key in the target URL means the
     * destination page's `ToastFlashListener` raises it after the provider is
     * definitely mounted, whether the navigation is soft or full.
     */
    router.replace(
      buildFlashHref(
        '/admin/kategori',
        isEdit ? 'kategori-diperbarui' : 'kategori-ditambahkan'
      )
    );
    router.refresh();
  }, [state, router, isEdit, notify]);

  const failedField = state.success ? undefined : state.field;
  const showErrorBanner = !state.success && state.error !== '';

  return (
    <div className="p-6 bg-white rounded border border-gray-200">
      <h2 className="text-[10px] uppercase tracking-widest text-[#666666] mb-4">
        {isEdit ? 'Edit Kategori' : 'Tambah Kategori'}
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
            htmlFor="name"
            className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
          >
            Nama kategori *
          </label>
          <input
            id="name"
            type="text"
            name="name"
            required
            maxLength={100}
            value={values.name}
            onChange={(e) => setValue('name', e.target.value)}
            placeholder="Nama kategori"
            className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
            aria-invalid={failedField === 'name'}
          />
          <FieldError
            message={failedField === 'name' && !state.success ? state.error : undefined}
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
          >
            Deskripsi (opsional)
          </label>
          <input
            id="description"
            type="text"
            name="description"
            maxLength={500}
            value={values.description}
            onChange={(e) => setValue('description', e.target.value)}
            placeholder="Deskripsi kategori"
            className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
            aria-invalid={failedField === 'description'}
          />
          <FieldError
            message={
              failedField === 'description' && !state.success ? state.error : undefined
            }
          />
        </div>

        {/* Image is uploaded to Cloudinary from the browser; the uploader writes
            imageUrl + publicId into hidden fields, so there is no manual URL
            input to mistype. */}
        <CategoryImageUploader
          initialImageUrl={initialValues.imageUrl}
          initialPublicId={initialValues.publicId}
          fieldError={
            failedField === 'imageUrl' && !state.success ? state.error : undefined
          }
        />

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
            Angka kecil tampil lebih dulu di katalog pelanggan.
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
                Kategori nonaktif disembunyikan dari katalog pelanggan.
              </span>
            </span>
          </label>
        </div>

        <p className="text-[10px] text-[#999999] font-light leading-relaxed">
          {isEdit
            ? 'Slug tetap sama (dibuat dari nama pertama kali).'
            : 'URL kategori dibuat otomatis dari nama dan tidak berubah saat disimpan ulang.'}
        </p>

        <div className="flex items-center gap-2 pt-2">
          <SubmitButton label={isEdit ? 'Simpan Perubahan' : 'Simpan'} />
          <Link
            href="/admin/kategori"
            className="inline-flex items-center gap-2 border border-[#E5E1DA] px-6 py-3 text-[11px] uppercase tracking-[0.14em] text-[#1A1A1A] hover:bg-[#FBF9F6] transition-colors"
          >
            <X size={12} strokeWidth={1.5} aria-hidden="true" /> Batal
          </Link>
        </div>
      </form>
    </div>
  );
}