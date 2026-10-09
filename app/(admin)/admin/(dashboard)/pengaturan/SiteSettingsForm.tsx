'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, Loader2, Save, Trash2 } from 'lucide-react';

import { updateSiteSettings, removeSiteLogo } from './actions';
import SiteImageUploader from './SiteImageUploader';
import type { SiteSettingsFormState } from './actions';
import type { AdminSiteSettings } from '@/lib/data/admin/site';
import { useToast } from '@/components/admin/ToastProvider';
import { ADMIN_TOASTS } from '@/lib/admin/toast';

/**
 * Site settings form — Client Component.
 *
 * The settings row is a singleton, so this form is always in "edit" mode: it
 * shows the current database values as `defaultValue` and submits the complete
 * set of fields on every save.
 *
 * It holds no field state of its own. `useActionState` carries the action
 * result (Indonesian messages, field errors) and `useFormStatus` drives the
 * pending state on the submit button.
 *
 * NOTIFICATIONS
 * A successful save raises a toast from the shared dashboard queue, plus a
 * warning toast when the hero photograph actually changed — replacing it leaves
 * the previous Cloudinary asset behind by design, and the admin should be told.
 * Validation and database failures stay inline beside the fields they concern.
 *
 * Prisma and credentials are never imported here — validation lives in the
 * server action, and the `required`/`type` attributes are usability aids only.
 */

interface SiteSettingsFormProps {
  settings: AdminSiteSettings;
}

/** Initial `useActionState` value. Declared here because a `'use server'`
 *  module may only export async functions. */
const IDLE_STATE: SiteSettingsFormState = { status: 'idle' };

function SubmitButton() {
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
          <Save size={13} strokeWidth={1.5} aria-hidden="true" />
          Simpan Pengaturan
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

/**
 * Deletes the site logo through its own action.
 *
 * Declared as its own component because `useFormStatus` reads the pending state
 * of the nearest enclosing form — and this button deliberately sits OUTSIDE the
 * settings `<form>`. Rendering it as a nested form would have made submitting it
 * also submit every other settings field, which is exactly the coupling the
 * separate action exists to avoid.
 */
function RemoveLogoButton({ disabled }: { disabled: boolean }) {
  const [state, formAction, pending] = useActionState<SiteSettingsFormState, FormData>(
    removeSiteLogo,
    IDLE_STATE
  );

  const [confirmed, setConfirmed] = useState(false);
  const { notify } = useToast();

  /*
   * Toast once per result. `removeSiteLogo` does not navigate, so the dashboard
   * provider is still mounted and the notification is raised directly. The ref
   * keeps a still-mounted result from re-firing on later renders.
   */
  const handledState = useRef<SiteSettingsFormState | null>(null);

  useEffect(() => {
    if (state.status !== 'success') return;
    if (handledState.current === state) return;

    handledState.current = state;
    notify(ADMIN_TOASTS['logo-dihapus']);
  }, [state, notify]);

  return (
    <div className="border-t border-[#E5E1DA] pt-4">
      {/* Errors stay inline so they remain next to the control that caused
          them; only the success case moves to the shared toast surface. */}
      {state.status === 'error' && state.message && (
        <p role="alert" className="mb-3 text-[10px] leading-relaxed text-[#A8452F]">
          {state.message}
        </p>
      )}

      {/*
        Two-step: the first click arms the action and the second commits it.
        Removing the logo is recoverable — the Cloudinary asset is left in place
        and can be re-uploaded or re-linked — but it silently changes the brand
        mark on every public page, so it should not be one stray click away.
      */}
      {confirmed ? (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            formAction={formAction}
            disabled={pending}
            className="inline-flex items-center gap-2 border border-[#C4553D] px-4 py-2.5 text-[10px] uppercase tracking-[0.14em] text-[#C4553D] hover:bg-[#C4553D] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? (
              <>
                <Loader2 size={12} strokeWidth={1.5} className="animate-spin" aria-hidden="true" />
                Menghapus...
              </>
            ) : (
              'Ya, hapus logo'
            )}
          </button>
          <button
            type="button"
            onClick={() => setConfirmed(false)}
            disabled={pending}
            className="text-[10px] uppercase tracking-[0.14em] text-[#999999] hover:text-[#1A1A1A] transition-colors disabled:opacity-50"
          >
            Batal
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmed(true)}
          disabled={disabled || pending}
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[#999999] hover:text-[#C4553D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={11} strokeWidth={1.5} aria-hidden="true" />
          Hapus logo dari situs
        </button>
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] uppercase tracking-[0.18em] text-[#8B7355] font-medium border-b border-[#E5E1DA] pb-3 mb-4">
      {children}
    </h2>
  );
}

const FIELD_CLASS =
  'w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light';
const LABEL_CLASS =
  'block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5';
const HINT_CLASS = 'mt-1.5 text-[10px] text-[#999999] font-light leading-relaxed';

export function SiteSettingsForm({ settings }: SiteSettingsFormProps) {
  const [state, formAction, pending] = useActionState<
    SiteSettingsFormState,
    FormData
  >(updateSiteSettings, IDLE_STATE);

  const fieldErrors = state.fieldErrors ?? {};
  const { notify } = useToast();

  /*
   * Toast once per result.
   *
   * Two toasts can come out of one save: the confirmation, and the warning the
   * server attaches when the hero photograph really changed. The ref ties both to
   * a single action result — `useActionState` keeps its state until the next
   * submit, so a status check alone would re-fire on every render.
   */
  const handledState = useRef<SiteSettingsFormState | null>(null);

  useEffect(() => {
    if (state.status !== 'success') return;
    if (handledState.current === state) return;

    handledState.current = state;
    notify(ADMIN_TOASTS['pengaturan-tersimpan']);

    if (state.warning) {
      notify({ tone: 'warning', message: state.warning });
    }
  }, [state, notify]);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {/* Errors only — a successful save is announced by the toast above, so
          repeating it in a banner here would show the same outcome twice. */}
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

      {/* ─── Identitas ───────────────────────────────────────────── */}
      <section className="border border-[#E5E1DA] bg-white p-5 sm:p-6">
        <SectionHeading>Identitas</SectionHeading>

        <div className="space-y-4">
          <div>
            <label htmlFor="siteName" className={LABEL_CLASS}>
              Nama Studio *
            </label>
            <input
              id="siteName"
              name="siteName"
              type="text"
              required
              maxLength={120}
              defaultValue={settings.siteName}
              placeholder="Studio Marmer"
              className={FIELD_CLASS}
              aria-invalid={Boolean(fieldErrors.siteName)}
            />
            <FieldError message={fieldErrors.siteName} />
          </div>

          <SiteImageUploader
            fieldPrefix="logo"
            inputId="logo-image-input"
            label="Logo Website"
            hint="Jika dikosongkan, situs menampilkan wordmark teks Studio Marmer."
            previewAlt="Pratinjau logo website"
            initialImageUrl={settings.logoUrl}
            initialPublicId={settings.logoPublicId}
            fieldError={fieldErrors.logoUrl ?? fieldErrors.logoPublicId}
          />

          {/* ─── Remove logo ───────────────────────────────────────── */}
          {/*
            A separate action rather than another submit of the main form, so
            dropping the logo can never write the rest of a half-filled settings
            row. Disabled while a save is in flight so the two writes cannot
            interleave on the same row.
          */}
          <RemoveLogoButton disabled={pending} />
        </div>
      </section>

      {/* ─── Kontak ─────────────────────────────────────────────── */}
      <section className="border border-[#E5E1DA] bg-white p-5 sm:p-6">
        <SectionHeading>Kontak</SectionHeading>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="whatsappNumber" className={LABEL_CLASS}>
                Nomor WhatsApp
              </label>
              <input
                id="whatsappNumber"
                name="whatsappNumber"
                type="text"
                inputMode="tel"
                maxLength={30}
                defaultValue={settings.whatsappNumber ?? ''}
                placeholder="+62 812-3456-7890"
                className={FIELD_CLASS}
                aria-invalid={Boolean(fieldErrors.whatsappNumber)}
              />
              <FieldError message={fieldErrors.whatsappNumber} />
              <p className={HINT_CLASS}>
                Otomatis disimpan sebagai nomor saja (contoh: 6281234567890),
                bukan tautan wa.me.
              </p>
            </div>

            <div>
              <label htmlFor="email" className={LABEL_CLASS}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                maxLength={255}
                defaultValue={settings.email ?? ''}
                placeholder="halo@contoh.id"
                className={FIELD_CLASS}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              <FieldError message={fieldErrors.email} />
            </div>
          </div>

          <div>
            <label htmlFor="address" className={LABEL_CLASS}>
              Alamat
            </label>
            <textarea
              id="address"
              name="address"
              rows={3}
              maxLength={255}
              defaultValue={settings.address ?? ''}
              placeholder="Alamat studio atau workshop"
              className={`${FIELD_CLASS} leading-relaxed resize-y`}
              aria-invalid={Boolean(fieldErrors.address)}
            />
            <FieldError message={fieldErrors.address} />
          </div>
        </div>
      </section>

      {/* ─── Marketplace / Social ────────────────────────────────── */}
      <section className="border border-[#E5E1DA] bg-white p-5 sm:p-6">
        <SectionHeading>Marketplace / Social</SectionHeading>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="shopeeUrl" className={LABEL_CLASS}>
              Shopee
            </label>
            <input
              id="shopeeUrl"
              name="shopeeUrl"
              type="url"
              maxLength={500}
              defaultValue={settings.shopeeUrl ?? ''}
              placeholder="https://shopee.co.id/…"
              className={FIELD_CLASS}
              aria-invalid={Boolean(fieldErrors.shopeeUrl)}
            />
            <FieldError message={fieldErrors.shopeeUrl} />
          </div>

          <div>
            <label htmlFor="instagramUrl" className={LABEL_CLASS}>
              Instagram
            </label>
            <input
              id="instagramUrl"
              name="instagramUrl"
              type="url"
              maxLength={500}
              defaultValue={settings.instagramUrl ?? ''}
              placeholder="https://instagram.com/…"
              className={FIELD_CLASS}
              aria-invalid={Boolean(fieldErrors.instagramUrl)}
            />
            <FieldError message={fieldErrors.instagramUrl} />
          </div>

          <div>
            <label htmlFor="tiktokUrl" className={LABEL_CLASS}>
              TikTok
            </label>
            <input
              id="tiktokUrl"
              name="tiktokUrl"
              type="url"
              maxLength={500}
              defaultValue={settings.tiktokUrl ?? ''}
              placeholder="https://tiktok.com/@…"
              className={FIELD_CLASS}
              aria-invalid={Boolean(fieldErrors.tiktokUrl)}
            />
            <FieldError message={fieldErrors.tiktokUrl} />
          </div>
        </div>

        <p className={`${HINT_CLASS} mt-3`}>
          Tautan yang dikosongkan tidak ditampilkan di halaman kontak. Tautan
          Shopee di sini dipakai sebagai tautan toko global.
        </p>
      </section>

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="border border-[#E5E1DA] bg-white p-5 sm:p-6">
        <SectionHeading>Hero</SectionHeading>

        <div className="space-y-4">
          <div>
            <label htmlFor="heroTitle" className={LABEL_CLASS}>
              Judul Hero
            </label>
            <input
              id="heroTitle"
              name="heroTitle"
              type="text"
              maxLength={200}
              defaultValue={settings.heroTitle ?? ''}
              placeholder="Keindahan Marmer, Dibentuk untuk Setiap Ruang."
              className={FIELD_CLASS}
              aria-invalid={Boolean(fieldErrors.heroTitle)}
            />
            <FieldError message={fieldErrors.heroTitle} />
          </div>

          <div>
            <label htmlFor="heroSubtitle" className={LABEL_CLASS}>
              Subtitle Hero
            </label>
            <textarea
              id="heroSubtitle"
              name="heroSubtitle"
              rows={3}
              maxLength={500}
              defaultValue={settings.heroSubtitle ?? ''}
              placeholder="Kalimat singkat yang tampil di bawah judul hero."
              className={`${FIELD_CLASS} leading-relaxed resize-y`}
              aria-invalid={Boolean(fieldErrors.heroSubtitle)}
            />
            <FieldError message={fieldErrors.heroSubtitle} />
            <p className={HINT_CLASS}>
              Jika dikosongkan, teks bawaan halaman utama yang ditampilkan.
            </p>
          </div>

          <div className="border-t border-[#E5E1DA] pt-4">
            <SiteImageUploader
              fieldPrefix="heroImage"
              inputId="hero-image-input"
              label="Gambar Hero Halaman Utama"
              hint="Jika dikosongkan, foto bawaan yang sudah disertakan pada aplikasi tetap dipakai."
              previewAlt="Pratinjau gambar hero halaman utama"
              previewShape="wide"
              initialImageUrl={settings.heroImageUrl}
              initialPublicId={settings.heroImagePublicId}
              fieldError={
                fieldErrors.heroImageUrl ?? fieldErrors.heroImagePublicId
              }
            />
          </div>
        </div>
      </section>

      {/* ─── Actions ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <SubmitButton />
      </div>
    </form>
  );
}