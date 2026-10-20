export type ProfileFormState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type PasswordFormState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const IDLE_PROFILE: ProfileFormState = { status: 'idle' };
export const IDLE_PASSWORD: PasswordFormState = { status: 'idle' };