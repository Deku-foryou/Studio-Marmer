'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, CheckCircle2, Loader2, Save } from 'lucide-react';

import { updateSiteSettings, type SiteSettingsFormState } from './actions';
import type { AdminSiteSettings } from '@/lib/data/admin/site';

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
  const [state, formAction] = useActionState<SiteSettingsFormState, FormData>(
    updateSiteSettings,
    IDLE_STATE
  );

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {/* ─── Result banner ───────────────────────────────────────── */}
      {state.message && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-start gap-2.5 border px-4 py-3 ${
            state.status === 'success'
              ? 'border-[#5C8A5C]/40 bg-[#5C8A5C]/5'
              : 'border-[#C4553D]/40 bg-[#C4553D]/5'
          }`}
        >
          {state.status === 'success' ? (
            <CheckCircle2
              size={15}
              className="text-[#5C8A5C] mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
          ) : (
            <AlertCircle
              size={15}
              className="text-[#C4553D] mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
          )}
          <p
            className={`text-xs leading-relaxed ${
              state.status === 'success' ? 'text-[#41693F]' : 'text-[#C4553D]'
            }`}
          >
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

          <div>
            <label htmlFor="logoUrl" className={LABEL_CLASS}>
              URL Logo
            </label>
            <input
              id="logoUrl"
              name="logoUrl"
              type="text"
              maxLength={500}
              defaultValue={settings.logoUrl ?? ''}
              placeholder="https://… atau /placeholders/logo.png"
              className={FIELD_CLASS}
              aria-invalid={Boolean(fieldErrors.logoUrl)}
            />
            <FieldError message={fieldErrors.logoUrl} />
            <p className={HINT_CLASS}>
              Untuk sementara isi URL logo secara manual. Unggah berkas akan
              tersedia pada tahap berikutnya.
            </p>
          </div>
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
        </div>
      </section>

      {/* ─── Actions ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <SubmitButton />
      </div>
    </form>
  );
}