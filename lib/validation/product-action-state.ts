/**
 * Shared shape for `useActionState` in the admin product form.
 *
 * WHY THIS IS ITS OWN MODULE
 * A `'use server'` module may only export async functions - the compiler
 * generates a loader where every export becomes a server action reference, so a
 * plain object export fails with:
 *
 *   A 'use server' file can only export async functions, found object.
 *
 * The idle state is a value, not an action, so it cannot live in
 * `produk/actions.ts` next to `createProduct` / `updateProduct`. It is declared
 * here instead and both sides import it: the actions type their return values
 * with `ProductFormState`, and the client form passes `IDLE_STATE` as the
 * initial argument to `useActionState`.
 *
 * The type lives here too, so the server actions file is left exporting nothing
 * but async functions.
 */

export type ProductFormState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  /** Field-level messages, keyed by form field name. */
  fieldErrors?: Record<string, string>;
};

/** The state a product form starts in, before any submit has run. */
export const IDLE_STATE: ProductFormState = { status: 'idle' };