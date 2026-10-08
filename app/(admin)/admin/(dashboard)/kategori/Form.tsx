'use client';

import { useActionState, useEffect, useRef } from 'react';
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

/**
 * Category create/edit form — Client Component.
 *
 * The form is uncontrolled: each field renders its initial value with
 * `defaultValue` and the browser collects the submission. No per-field state is
 * kept, so there is nothing to synchronise with the server action result.
 *
 * The action result (`CategoryActionResult`) drives the Indonesian success and
 * error messages plus the single field the server rejected, and
 * `useFormStatus` drives the pending state on the submit button.
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

  // Both create and edit return to the list so the admin immediately sees the
  // result reflected in the table. The ref keeps the navigation to once per
  // successful submission without spending an extra render pass on a flag.
  const hasRedirected = useRef(false);

  // The category id travels as a hidden field rather than as a bound argument,
  // so both modes submit through one unbound action signature.
  const action = isEdit ? updateCategory : createCategory;

  const [state, formAction] = useActionState<CategoryActionResult, FormData>(
    action,
    INITIAL_STATE
  );

  useEffect(() => {
    if (state.success && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/admin/kategori');
      router.refresh();
    }
  }, [state, router]);

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
            defaultValue={initialValues.name}
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
            defaultValue={initialValues.description}
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
            defaultValue={String(initialValues.sortOrder)}
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