'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { Plus, Trash2, AlertCircle, Loader2 } from 'lucide-react';

import type { AdminCategoryRow, AdminProductDetail } from '@/lib/data/admin/products';
import ProductImageUploader from './ProductImageUploader';
import { createProduct, updateProduct } from './actions';
import {
  IDLE_STATE,
  type ProductFormState,
} from '@/lib/validation/product-action-state';
import { useToast } from '@/components/admin/ToastProvider';
import { ADMIN_TOASTS } from '@/lib/admin/toast';

/**
 * Product create/edit form — Client Component.
 *
 * Holds only UI state: repeatable specification and image rows, and the action
 * result used for Indonesian error messages and the success toast.
 *
 * It never imports Prisma or any credential. Validation lives in the server
 * actions; the `required`/`type` attributes here are usability aids only.
 *
 * SUCCESS VS ERROR
 * A successful save raises a toast from the shared dashboard queue — one surface
 * for create, update and delete alike. A failure stays inline, next to the fields
 * it concerns.
 */

interface ProductFormProps {
  categories: AdminCategoryRow[];
  /** Present when editing. */
  product?: AdminProductDetail;
}

type SpecRow = { label: string; value: string };

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
        label
      )}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-[10px] text-[#C4553D] leading-relaxed">
      {message}
    </p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] uppercase tracking-[0.18em] text-[#8B7355] font-medium border-b border-[#E5E1DA] pb-3 mb-4">
      {children}
    </h2>
  );
}

export function ProductForm({ categories, product }: ProductFormProps) {
  const isEdit = Boolean(product);

  // useActionState keeps the previous state across the submission and exposes
  // `pending` through useFormStatus in the submit button above.
  const action = isEdit
    ? updateProduct.bind(null, product!.id)
    : createProduct;

  const [state, formAction] = useActionState<ProductFormState, FormData>(
    action,
    IDLE_STATE
  );

  const [specs, setSpecs] = useState<SpecRow[]>(
    product && product.specifications.length > 0
      ? product.specifications
      : [{ label: '', value: '' }]
  );

  const fieldErrors = state.fieldErrors ?? {};

  /**
   * Raise a toast exactly once per action result.
   *
   * `useActionState` holds its result until the next submit, so an effect keyed
   * only on `state.status === 'success'` would re-fire on every unrelated
   * re-render for as long as the form stays mounted. Comparing against the exact
   * state object last handled ties the toast to one result rather than to a
   * status that merely persists.
   *
   * The tone comes from the catalogue, not from `state.message`: the message is
   * the form's own copy, and the toast wording is chosen once in lib/admin/toast
   * so it cannot drift from the notification the admin saw for the same action
   * on another screen.
   */
  const { notify } = useToast();
  const handledState = useRef<ProductFormState | null>(null);

  useEffect(() => {
    if (state.status !== 'success') return;
    if (handledState.current === state) return;

    handledState.current = state;
    notify(
      ADMIN_TOASTS[isEdit ? 'produk-diperbarui' : 'produk-ditambahkan']
    );
  }, [state, isEdit, notify]);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {/*
        ERRORS ONLY.
        Success moved to the global toast so that create, update and delete all
        report through one surface. Validation and database failures stay inline
        because they are specific to this form — the field-level messages below
        point at the offending input, and a floating toast cannot do that. The
        banner itself is retained for the errors that have no single field
        (authorisation, unknown category).
      */}
      {state.status === 'error' && state.message && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2.5 border border-[#C4553D]/40 bg-[#C4553D]/5 px-4 py-3"
        >
          <AlertCircle
            size={15}
            className="text-[#C4553D] mt-0.5 flex-shrink-0"
            aria-hidden="true"
          />
          <p className="text-xs text-[#A8452F] leading-relaxed">
            {state.message}
          </p>
        </div>
      )}

      {/* ─── General ───────────────────────────────────────────── */}
      <section className="border border-[#E5E1DA] bg-white p-5 sm:p-6">
        <SectionHeading>Informasi Umum</SectionHeading>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
            >
              Nama Produk *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={200}
              defaultValue={product?.name ?? ''}
              placeholder="Contoh: Tempat Tisu Marmer Carrara"
              className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
              aria-invalid={Boolean(fieldErrors.name)}
            />
            <FieldError message={fieldErrors.name} />
            {isEdit && product && (
              <p className="mt-1.5 text-[10px] text-[#999999] font-light">
                URL produk (slug) tetap:{' '}
                <span className="text-[#8B7355]">/produk/{product.slug}</span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="categoryId"
              className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
            >
              Kategori *
            </label>
            <select
              id="categoryId"
              name="categoryId"
              required
              defaultValue={product?.categoryId ?? ''}
              className="w-full border border-[#E5E1DA] bg-white focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
              aria-invalid={Boolean(fieldErrors.categoryId)}
            >
              <option value="">Pilih kategori…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.categoryId} />
          </div>

          <div>
            <label
              htmlFor="shortDescription"
              className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
            >
              Deskripsi Singkat *
            </label>
            <input
              id="shortDescription"
              name="shortDescription"
              type="text"
              required
              maxLength={500}
              defaultValue={product?.shortDescription ?? ''}
              className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
              aria-invalid={Boolean(fieldErrors.shortDescription)}
            />
            <FieldError message={fieldErrors.shortDescription} />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
            >
              Deskripsi Lengkap *
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={5}
              defaultValue={product?.description ?? ''}
              className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light leading-relaxed resize-y"
              aria-invalid={Boolean(fieldErrors.description)}
            />
            <FieldError message={fieldErrors.description} />
          </div>
        </div>
      </section>

      {/* ─── Pricing ───────────────────────────────────────────── */}
      <section className="border border-[#E5E1DA] bg-white p-5 sm:p-6">
        <SectionHeading>Harga</SectionHeading>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="pricingType"
              className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
            >
              Tipe Harga *
            </label>
            <select
              id="pricingType"
              name="pricingType"
              required
              defaultValue={product?.pricingType ?? 'FIXED'}
              className="w-full border border-[#E5E1DA] bg-white focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
            >
              <option value="FIXED">Harga Tetap</option>
              <option value="STARTING_FROM">Mulai Dari</option>
            </select>
            <FieldError message={fieldErrors.pricingType} />
          </div>

          <div>
            <label
              htmlFor="price"
              className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
            >
              Harga (Rp) *
            </label>
            <input
              id="price"
              name="price"
              type="number"
              inputMode="numeric"
              min={1}
              step="1"
              required
              defaultValue={product ? String(product.price) : ''}
              placeholder="185000"
              className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
              aria-invalid={Boolean(fieldErrors.price)}
            />
            <FieldError message={fieldErrors.price} />
          </div>

          <div>
            <label
              htmlFor="originalPrice"
              className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
            >
              Harga Awal (opsional)
            </label>
            <input
              id="originalPrice"
              name="originalPrice"
              type="number"
              inputMode="numeric"
              min={1}
              step="1"
              defaultValue={
                product?.originalPrice !== null && product?.originalPrice !== undefined
                  ? String(product.originalPrice)
                  : ''
              }
              placeholder="215000"
              className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
              aria-invalid={Boolean(fieldErrors.originalPrice)}
            />
            <FieldError message={fieldErrors.originalPrice} />
          </div>
        </div>

        <p className="mt-3 text-[10px] text-[#999999] font-light leading-relaxed">
          Persentase diskon dihitung otomatis dari harga awal dan tidak
          disimpan. Harga awal harus lebih besar dari harga.
        </p>
      </section>

      {/* ─── Product details ───────────────────────────────────── */}
      <section className="border border-[#E5E1DA] bg-white p-5 sm:p-6">
        <SectionHeading>Detail Produk</SectionHeading>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="stoneType"
              className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
            >
              Jenis Marmer *
            </label>
            <input
              id="stoneType"
              name="stoneType"
              type="text"
              required
              maxLength={120}
              defaultValue={product?.stoneType ?? ''}
              placeholder="Carrara"
              className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
              aria-invalid={Boolean(fieldErrors.stoneType)}
            />
            <FieldError message={fieldErrors.stoneType} />
          </div>

          <div>
            <label
              htmlFor="color"
              className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
            >
              Warna *
            </label>
            <input
              id="color"
              name="color"
              type="text"
              required
              maxLength={120}
              defaultValue={product?.color ?? ''}
              placeholder="Putih abu-abu"
              className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
              aria-invalid={Boolean(fieldErrors.color)}
            />
            <FieldError message={fieldErrors.color} />
          </div>

          <div>
            <label
              htmlFor="dimensions"
              className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
            >
              Dimensi *
            </label>
            <input
              id="dimensions"
              name="dimensions"
              type="text"
              required
              maxLength={120}
              defaultValue={product?.dimensions ?? ''}
              placeholder="15 x 12 x 11 cm"
              className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
              aria-invalid={Boolean(fieldErrors.dimensions)}
            />
            <FieldError message={fieldErrors.dimensions} />
          </div>

          <div>
            <label
              htmlFor="weightGrams"
              className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
            >
              Berat (gram) *
            </label>
            <input
              id="weightGrams"
              name="weightGrams"
              type="number"
              inputMode="numeric"
              min={1}
              step="1"
              required
              defaultValue={product ? String(product.weightGrams) : ''}
              placeholder="2400"
              className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
              aria-invalid={Boolean(fieldErrors.weightGrams)}
            />
            <FieldError message={fieldErrors.weightGrams} />
          </div>

          <div>
            <label
              htmlFor="material"
              className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
            >
              Material (opsional)
            </label>
            <input
              id="material"
              name="material"
              type="text"
              maxLength={120}
              defaultValue={product?.material ?? ''}
              placeholder="Marmer Carrara"
              className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
            />
            <FieldError message={fieldErrors.material} />
          </div>

          <div>
            <label
              htmlFor="craftingTime"
              className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
            >
              Waktu Pembuatan (opsional)
            </label>
            <input
              id="craftingTime"
              name="craftingTime"
              type="text"
              maxLength={120}
              defaultValue={product?.craftingTime ?? ''}
              placeholder="5-7 hari kerja"
              className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
            />
            <FieldError message={fieldErrors.craftingTime} />
          </div>
        </div>
      </section>

      {/* ─── Specifications ────────────────────────────────────── */}
      <section className="border border-[#E5E1DA] bg-white p-5 sm:p-6">
        <SectionHeading>Spesifikasi (opsional)</SectionHeading>

        <div className="space-y-2">
          {specs.map((row, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  name={`spec_${index}_label`}
                  defaultValue={row.label}
                  placeholder="Label (mis. Finishing)"
                  aria-label={`Label spesifikasi baris ${index + 1}`}
                  className="border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
                />
                <input
                  type="text"
                  name={`spec_${index}_value`}
                  defaultValue={row.value}
                  placeholder="Nilai (mis. Polished)"
                  aria-label={`Nilai spesifikasi baris ${index + 1}`}
                  className="border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setSpecs((prev) =>
                    prev.length === 1
                      ? [{ label: '', value: '' }]
                      : prev.filter((_, i) => i !== index)
                  )
                }
                className="mt-0.5 p-2.5 text-[#999999] hover:text-[#C4553D] transition-colors border border-[#E5E1DA] flex-shrink-0"
                aria-label={`Hapus baris spesifikasi ${index + 1}`}
              >
                <Trash2 size={13} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSpecs((prev) => [...prev, { label: '', value: '' }])}
          className="mt-3 inline-flex items-center gap-1.5 border border-[#E5E1DA] px-3.5 py-2 text-[10px] uppercase tracking-[0.14em] text-[#1A1A1A] hover:bg-[#FBF9F6] transition-colors"
        >
          <Plus size={12} strokeWidth={1.5} aria-hidden="true" />
          Tambah Baris
        </button>
        <FieldError message={fieldErrors.specifications} />
      </section>

      {/* ─── Photos (Cloudinary upload, Phase 6C-1) ─────────────── */}
      {/* Owns its own upload + ordering state and writes the results into
          hidden fields, so this form no longer tracks image rows itself. */}
      <ProductImageUploader
        initialImages={
          product?.images.map((image) => ({
            imageUrl: image.imageUrl,
            altText: image.altText ?? '',
            publicId: image.publicId ?? '',
            fileName: '',
          })) ?? []
        }
        fieldError={fieldErrors.images}
      />

      {/* ─── Business flags ────────────────────────────────────── */}
      <section className="border border-[#E5E1DA] bg-white p-5 sm:p-6">
        <SectionHeading>Penjualan</SectionHeading>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label
              htmlFor="shopeeUrl"
              className="block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5"
            >
              Tautan Shopee (opsional)
            </label>
            <input
              id="shopeeUrl"
              name="shopeeUrl"
              type="url"
              maxLength={500}
              defaultValue={product?.shopeeUrl ?? ''}
              placeholder="https://shopee.co.id/…"
              className="w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light"
              aria-invalid={Boolean(fieldErrors.shopeeUrl)}
            />
            <FieldError message={fieldErrors.shopeeUrl} />
            <p className="mt-1.5 text-[10px] text-[#999999] font-light">
              Jika kosong, tautan Shopee toko pada pengaturan digunakan.
            </p>
          </div>

          {[
            {
              name: 'isAvailable',
              label: 'Tersedia',
              hint: 'Produk tampil di katalog pelanggan',
              defaultChecked: product ? product.isAvailable : true,
            },
            {
              name: 'isUniquePiece',
              label: 'Satu-satunya',
              hint: 'Menampilkan label satu-satunya',
              defaultChecked: product ? product.isUniquePiece : false,
            },
            {
              name: 'isFeatured',
              label: 'Unggulan',
              hint: 'Muncul di bagian produk unggulan',
              defaultChecked: product ? product.isFeatured : false,
            },
            {
              name: 'whatsappEnabled',
              label: 'Aktifkan WhatsApp',
              hint: 'Menampilkan tombol pesan via WhatsApp',
              defaultChecked: product ? product.whatsappEnabled : true,
            },
          ].map((flag) => (
            <label
              key={flag.name}
              htmlFor={flag.name}
              className="flex items-start gap-2.5 cursor-pointer"
            >
              <input
                id={flag.name}
                name={flag.name}
                type="checkbox"
                defaultChecked={flag.defaultChecked}
                className="mt-0.5 w-4 h-4 accent-[#1A1A1A]"
              />
              <span>
                <span className="block text-[12px] text-[#1A1A1A] font-medium">
                  {flag.label}
                </span>
                <span className="block text-[10px] text-[#999999] font-light">
                  {flag.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* ─── Actions ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <SubmitButton label={isEdit ? 'Simpan Perubahan' : 'Simpan Produk'} />
        <Link
          href="/admin/produk"
          className="inline-flex items-center border border-[#E5E1DA] px-6 py-3 text-[11px] uppercase tracking-[0.14em] text-[#1A1A1A] hover:bg-white transition-colors"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
