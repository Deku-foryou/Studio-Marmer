'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, Loader2, Save } from 'lucide-react';

import { updateProfile, updatePassword } from './actions';
import { IDLE_PROFILE, IDLE_PASSWORD } from './state';
import type { ProfileFormState, PasswordFormState } from './state';
import { useToast } from '@/components/admin/ToastProvider';

const FIELD_CLASS =
  'w-full border border-[#E5E1DA] focus:border-[#1A1A1A] outline-none text-[13px] px-3.5 py-2.5 font-light';
const LABEL_CLASS =
  'block text-[10px] uppercase tracking-[0.14em] text-[#666666] font-medium mb-1.5';
const HINT_CLASS = 'mt-1.5 text-[10px] text-[#999999] font-light leading-relaxed';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[10px] text-[#C4553D] leading-relaxed">{message}</p>;
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
          <Save size={13} strokeWidth={1.5} aria-hidden="true" />
          {label}
        </>
      )}
    </button>
  );
}

interface ProfileFormProps {
  name: string;
  email: string;
}

export function ProfileForm({ name, email }: ProfileFormProps) {
  const [profileState, profileAction] = useActionState<ProfileFormState, FormData>(
    updateProfile,
    IDLE_PROFILE
  );
  const [passwordState, passwordAction] = useActionState<PasswordFormState, FormData>(
    updatePassword,
    IDLE_PASSWORD
  );

  const [profileValues, setProfileValues] = useState({
    name,
    email,
    currentPassword: '',
  });
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const { notify } = useToast();
  const handledProfile = useRef<ProfileFormState | null>(null);
  const handledPassword = useRef<PasswordFormState | null>(null);

  useEffect(() => {
    if (handledProfile.current === profileState) return;
    handledProfile.current = profileState;
    if (profileState.status === 'error' && profileState.message) {
      notify({ tone: 'error', message: profileState.message });
    }
    if (profileState.status === 'success' && profileState.message) {
      notify({ tone: 'success', message: profileState.message });
    }
  }, [profileState, notify]);

  useEffect(() => {
    if (handledPassword.current === passwordState) return;
    handledPassword.current = passwordState;
    if (passwordState.status === 'error' && passwordState.message) {
      notify({ tone: 'error', message: passwordState.message });
    }
    if (passwordState.status === 'success' && passwordState.message) {
      notify({ tone: 'success', message: passwordState.message });
    }
  }, [passwordState, notify]);

  const profileFieldErrors = profileState.fieldErrors ?? {};
  const passwordFieldErrors = passwordState.fieldErrors ?? {};

  return (
    <div className="space-y-6">
      <section className="border border-[#E5E1DA] bg-white p-5 sm:p-6">
        <h2 className="text-[10px] uppercase tracking-[0.18em] text-[#8B7355] font-medium border-b border-[#E5E1DA] pb-3 mb-4">
          Profil
        </h2>

        {profileState.status === 'error' && profileState.message && (
          <div role="alert" className="mb-4 flex items-start gap-2.5 border border-[#C4553D]/40 bg-[#C4553D]/5 px-4 py-3">
            <AlertCircle size={15} className="text-[#C4553D] mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-xs text-[#A8452F] leading-relaxed">{profileState.message}</p>
          </div>
        )}

        <form action={profileAction} className="space-y-4" noValidate>
          <div>
            <label htmlFor="profile-name" className={LABEL_CLASS}>
              Nama *
            </label>
            <input
              id="profile-name"
              name="name"
              type="text"
              required
              maxLength={80}
              value={profileValues.name}
              onChange={(e) => setProfileValues((prev) => ({ ...prev, name: e.target.value }))}
              className={FIELD_CLASS}
              aria-invalid={Boolean(profileFieldErrors.name)}
            />
            <FieldError message={profileFieldErrors.name} />
          </div>

          <div>
            <label htmlFor="profile-email" className={LABEL_CLASS}>
              Email *
            </label>
            <input
              id="profile-email"
              name="email"
              type="email"
              required
              maxLength={255}
              value={profileValues.email}
              onChange={(e) => setProfileValues((prev) => ({ ...prev, email: e.target.value }))}
              className={FIELD_CLASS}
              aria-invalid={Boolean(profileFieldErrors.email)}
            />
            <FieldError message={profileFieldErrors.email} />
          </div>

          {profileValues.email.trim().toLowerCase() !== email.trim().toLowerCase() && (
            <div>
              <label htmlFor="profile-current-password" className={LABEL_CLASS}>
                Password saat ini *
              </label>
              <input
                id="profile-current-password"
                name="currentPassword"
                type="password"
                autoComplete="off"
                required
                value={profileValues.currentPassword}
                onChange={(e) =>
                  setProfileValues((prev) => ({ ...prev, currentPassword: e.target.value }))
                }
                className={FIELD_CLASS}
                aria-invalid={Boolean(profileFieldErrors.currentPassword)}
              />
              <p className="mt-1.5 text-[10px] text-[#999999] font-light leading-relaxed">
                Wajib diisi jika email diubah.
              </p>
              <FieldError message={profileFieldErrors.currentPassword} />
            </div>
          )}

          <SubmitButton label="Simpan Profil" />
        </form>
      </section>

      <section className="border border-[#E5E1DA] bg-white p-5 sm:p-6">
        <h2 className="text-[10px] uppercase tracking-[0.18em] text-[#8B7355] font-medium border-b border-[#E5E1DA] pb-3 mb-4">
          Ubah Password
        </h2>

        {passwordState.status === 'error' && passwordState.message && (
          <div role="alert" className="mb-4 flex items-start gap-2.5 border border-[#C4553D]/40 bg-[#C4553D]/5 px-4 py-3">
            <AlertCircle size={15} className="text-[#C4553D] mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-xs text-[#A8452F] leading-relaxed">{passwordState.message}</p>
          </div>
        )}

        <form action={passwordAction} className="space-y-4" noValidate>
          <div>
            <label htmlFor="password-current" className={LABEL_CLASS}>
              Password saat ini *
            </label>
            <input
              id="password-current"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              value={passwordValues.currentPassword}
              onChange={(e) =>
                setPasswordValues((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
              className={FIELD_CLASS}
              aria-invalid={Boolean(passwordFieldErrors.currentPassword)}
            />
            <FieldError message={passwordFieldErrors.currentPassword} />
          </div>

          <div>
            <label htmlFor="password-new" className={LABEL_CLASS}>
              Password baru *
            </label>
            <input
              id="password-new"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={passwordValues.newPassword}
              onChange={(e) =>
                setPasswordValues((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              className={FIELD_CLASS}
              aria-invalid={Boolean(passwordFieldErrors.newPassword)}
            />
            <p className={HINT_CLASS}>Minimal 8 karakter.</p>
            <FieldError message={passwordFieldErrors.newPassword} />
          </div>

          <div>
            <label htmlFor="password-confirm" className={LABEL_CLASS}>
              Konfirmasi password baru *
            </label>
            <input
              id="password-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={passwordValues.confirmPassword}
              onChange={(e) =>
                setPasswordValues((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              className={FIELD_CLASS}
              aria-invalid={Boolean(passwordFieldErrors.confirmPassword)}
            />
            <FieldError message={passwordFieldErrors.confirmPassword} />
          </div>

          <SubmitButton label="Ubah Password" />
        </form>
      </section>
    </div>
  );
}