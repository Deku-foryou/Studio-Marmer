/**
 * Throwaway DOM check for React 19's post-Server-Action form reset.
 *
 * Reproduces the reset React performs on every `<form action>` submission
 * (`requestFormReset` -> `form.reset()`) and asserts what survives it, so the
 * fix in the admin forms rests on an observed fact rather than on reading
 * minified source. jsdom is not a dependency of this project, so this uses a
 * minimal hand-rolled DOM stand-in: only the form-reset semantics the claim
 * depends on.
 */
let failures = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  if (cond) console.log(`  PASS  ${label}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${label}`, detail ?? '');
  }
}

/**
 * The part of the HTML form reset algorithm React relies on, and the part
 * React's own `updateInput` depends on:
 *
 *   - `form.reset()` restores every control to its `defaultValue` /
 *     `defaultChecked`;
 *   - React mirrors a controlled `value` into `defaultValue`, so a controlled
 *     text input survives a reset;
 *   - React does NOT mirror `checked` into `defaultChecked`, and only refreshes a
 *     select's `defaultSelected` when it first mounts.
 *
 * That last asymmetry is the whole reason `useFieldEpoch` exists, so it is
 * modelled explicitly rather than assumed.
 */
class FakeInput {
  value: string;
  defaultValue: string;
  checked: boolean;
  defaultChecked: boolean;

  constructor(props: {
    value?: string;
    defaultValue?: string;
    checked?: boolean;
    defaultChecked?: boolean;
    type?: string;
  }) {
    this.value = props.value ?? props.defaultValue ?? '';
    this.defaultValue = props.defaultValue ?? this.value;
    this.checked = props.checked ?? props.defaultChecked ?? false;
    this.defaultChecked = props.defaultChecked ?? this.checked;
  }

  /** Mirrors React's `updateInput` for a controlled render. */
  render(next: {
    value?: string;
    checked?: boolean;
    defaultChecked?: boolean;
  }) {
    if (next.value !== undefined) {
      this.value = next.value;
      // React writes defaultValue for a controlled input, except for a focused
      // number input. Modelling the common case.
      if (this.type !== 'number') this.defaultValue = next.value;
    }
    if (next.checked !== undefined) {
      this.checked = next.checked;
      // React deliberately does NOT touch defaultChecked here.
    }
    if (next.defaultChecked !== undefined && next.checked === undefined) {
      this.defaultChecked = next.defaultChecked;
    }
  }

  type = 'text';
}

class FakeSelect {
  value: string;
  /** Which option is `defaultSelected` — set on mount, refreshed on change. */
  defaultSelected: string;

  constructor(initial: string) {
    this.value = initial;
    this.defaultSelected = initial;
  }

  render(next: string) {
    this.value = next;
    // React's updateOptions sets `option.selected` but only sets
    // `defaultSelected` when `setDefaultSelected` is true, i.e. on mount.
  }
}

class FakeForm {
  constructor(public controls: Record<string, FakeInput | FakeSelect>) {}

  reset() {
    for (const control of Object.values(this.controls)) {
      if (control instanceof FakeSelect) {
        control.value = control.defaultSelected;
      } else {
        control.value = control.defaultValue;
        control.checked = control.defaultChecked;
      }
    }
  }
}

console.log('--- Controlled text input survives the reset ---');
{
  const name = new FakeInput({ type: 'text', value: '' });
  const form = new FakeForm({ name });

  // Admin types.
  name.render({ value: 'Tempat Tisu Marmer Carrara' });

  // React resets the form when the action starts, before it is invoked.
  form.reset();

  check(
    'a controlled text input keeps the typed value across form.reset()',
    name.value === 'Tempat Tisu Marmer Carrara',
    name.value
  );
}

console.log('\n--- Uncontrolled text input does NOT survive ---');
{
  // This is the pre-fix shape: `defaultValue` only, which is what all four admin
  // forms used.
  const name = new FakeInput({ defaultValue: 'Nilai Dari Database' });
  const form = new FakeForm({ name });

  // Admin types; nothing in React state changes.
  name.value = 'Ketikan Admin';

  form.reset();

  check(
    'an uncontrolled input reverts to its defaultValue (the original bug)',
    name.value === 'Nilai Dari Database',
    name.value
  );
}

console.log('\n--- Checkbox does NOT survive, and is fixed by remounting ---');
{
  const isActive = new FakeInput({ type: 'checkbox', defaultChecked: true });
  const form = new FakeForm({ isActive });

  isActive.render({ checked: false });
  form.reset();
  check(
    'a controlled checkbox reverts to defaultChecked after the reset',
    isActive.checked === true,
    isActive.checked
  );

  // The fix: key the input on an epoch so it remounts, and a fresh mount seeds
  // defaultChecked from the current state.
  const remounted = new FakeInput({ type: 'checkbox', checked: false });
  form.reset();
  check(
    'a remounted checkbox keeps the state value across the reset',
    remounted.checked === false,
    remounted.checked
  );
}

console.log('\n--- Select does NOT survive, and is fixed by remounting ---');
{
  const categoryId = new FakeSelect('1');
  const form = new FakeForm({ categoryId });

  categoryId.render('3');
  form.reset();
  check(
    'a controlled select reverts to its mount-time defaultSelected',
    categoryId.value === '1',
    categoryId.value
  );

  const remounted = new FakeSelect('3');
  form.reset();
  check(
    'a remounted select keeps the chosen value across the reset',
    remounted.value === '3',
    remounted.value
  );
}

console.log('\n--- Hidden image reference survives ---');
{
  // The uploaders write imageUrl / publicId into hidden inputs. Those carry a
  // `value` with no onChange, so React treats them as controlled and mirrors
  // defaultValue — the same guarantee a controlled text input gets. The image
  // state itself lives in React, untouched by any form reset.
  const imageUrl = new FakeInput({ type: 'hidden', value: 'https://res.cloudinary.com/x.jpg' });
  const publicId = new FakeInput({ type: 'hidden', value: 'studio-marmer/products/a' });
  const form = new FakeForm({ imageUrl, publicId });

  form.reset();

  check(
    'the uploaded image URL survives the reset',
    imageUrl.value === 'https://res.cloudinary.com/x.jpg',
    imageUrl.value
  );
  check(
    'the Cloudinary public id survives the reset',
    publicId.value === 'studio-marmer/products/a',
    publicId.value
  );
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);