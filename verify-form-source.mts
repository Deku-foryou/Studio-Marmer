/**
 * Static invariant check over the admin form sources.
 *
 * The React 19 form reset (see verify-form-reset.mts) is neutralised per control
 * type in different ways, and it is easy to reintroduce the bug later by adding
 * one `defaultValue` to a new field. This asserts the shape directly on the real
 * source files, so a regression fails here rather than in a browser.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  if (cond) console.log(`  PASS  ${label}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${label}`, detail ?? '');
  }
}

const FORMS = [
  'app/(admin)/admin/(dashboard)/produk/ProductForm.tsx',
  'app/(admin)/admin/(dashboard)/produk/ProductImageUploader.tsx',
  'app/(admin)/admin/(dashboard)/kategori/Form.tsx',
  'app/(admin)/admin/(dashboard)/kategori/CategoryImageUploader.tsx',
  'app/(admin)/admin/(dashboard)/galeri/Form.tsx',
  'app/(admin)/admin/(dashboard)/galeri/GalleryImageUploader.tsx',
  'app/(admin)/admin/(dashboard)/pengaturan/SiteSettingsForm.tsx',
  'app/(admin)/admin/(dashboard)/pengaturan/SiteImageUploader.tsx',
];

/**
 * Strips comments so a `defaultValue` mentioned in prose is not mistaken for a
 * real prop. Handles the block and line comment forms used in this codebase.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Every opening tag for a form control, with its attributes. */
function controlTags(source: string): { name: string; tag: string; attrs: string }[] {
  const out: { name: string; tag: string; attrs: string }[] = [];

  // Matches <input ...>, <select ...>, <textarea ...> up to the closing bracket.
  const pattern = /<(input|select|textarea)\b([^>]*?)\/?>/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    const [, tag, attrs] = match;
    const nameMatch = /\bname=\{?[`'"]([^`'"]+)[`'"]/.exec(attrs);
    const name = nameMatch ? nameMatch[1] : '';

    out.push({ name, tag, attrs });
  }

  return out;
}

/** True for a control that carries a `value` prop (hidden inputs included). */
function hasValueProp(attrs: string): boolean {
  return /\bvalue=\{/.test(attrs);
}

function hasDefaultValue(attrs: string): boolean {
  return /\bdefaultValue=\{/.test(attrs);
}

function hasOnChange(attrs: string): boolean {
  return /\bonChange=/.test(attrs);
}

function hasKey(attrs: string): boolean {
  return /\bkey=/.test(attrs);
}

console.log('--- No uncontrolled defaultValue inputs remain ---');
for (const file of FORMS) {
  const source = stripComments(readFileSync(file, 'utf8'));
  const controls = controlTags(source);

  // The file inputs are genuinely uncontrolled: a browser cannot repopulate a
  // file picker, and these hold no value that needs preserving.
  const offenders = controls.filter(
    (control) =>
      control.tag === 'input' &&
      /type="file"/.test(control.attrs) === false &&
      hasDefaultValue(control.attrs)
  );

  check(
    `${file}: no input uses defaultValue`,
    offenders.length === 0,
    offenders.map((o) => o.name || o.attrs.slice(0, 60))
  );
}

console.log('\n--- Every controlled control is complete (value + onChange) ---');
for (const file of FORMS) {
  const source = stripComments(readFileSync(file, 'utf8'));
  const controls = controlTags(source);

  const incomplete = controls.filter(
    (control) =>
      control.tag === 'input' &&
      /type="file"/.test(control.attrs) === false &&
      hasValueProp(control.attrs) &&
      !hasOnChange(control.attrs)
  );

  check(
    `${file}: every valued input has an onChange`,
    incomplete.length === 0,
    incomplete.map((o) => o.name || o.attrs.slice(0, 60))
  );
}

console.log('\n--- Checkboxes are controlled and keyed on the epoch ---');
for (const file of FORMS) {
  const source = stripComments(readFileSync(file, 'utf8'));
  const checkboxes = controlTags(source).filter(
    (control) => control.tag === 'input' && /type="checkbox"/.test(control.attrs)
  );

  if (checkboxes.length === 0) continue;

  const broken = checkboxes.filter(
    (control) =>
      !hasValueProp(control.attrs) ||
      !/checked=\{/.test(control.attrs) ||
      !hasOnChange(control.attrs) ||
      !hasKey(control.attrs)
  );

  check(
    `${file}: every checkbox is checked+onChange+keyed`,
    broken.length === 0,
    broken.map((o) => o.name || o.attrs.slice(0, 80))
  );
}

console.log('\n--- Selects are controlled and keyed on the epoch ---');
for (const file of FORMS) {
  const source = stripComments(readFileSync(file, 'utf8'));
  const selects = controlTags(source).filter((control) => control.tag === 'select');

  if (selects.length === 0) continue;

  const broken = selects.filter(
    (control) =>
      !hasValueProp(control.attrs) ||
      !hasOnChange(control.attrs) ||
      !hasKey(control.attrs)
  );

  check(
    `${file}: every select is controlled and keyed`,
    broken.length === 0,
    broken.map((o) => o.name || o.attrs.slice(0, 80))
  );
}

console.log('\n--- Forms that need the epoch import it ---');
{
  const withSelectOrCheckbox = FORMS.filter((file) => {
    const source = stripComments(readFileSync(file, 'utf8'));
    return controlTags(source).some(
      (control) =>
        control.tag === 'select' ||
        (control.tag === 'input' && /type="checkbox"/.test(control.attrs))
    );
  });

  for (const file of withSelectOrCheckbox) {
    const source = readFileSync(file, 'utf8');
    check(`${file}: imports useFieldEpoch`, source.includes('useFieldEpoch'));
    check(`${file}: calls useFieldEpoch`, /useFieldEpoch\(/.test(source));
  }
}

console.log('\n--- Uploaders keep their image state out of form state ---');
{
  const productUploader = readFileSync(
    'app/(admin)/admin/(dashboard)/produk/ProductImageUploader.tsx',
    'utf8'
  );
  check(
    'ProductImageUploader holds images in React state',
    /const \[images, setImages\] = useState/.test(productUploader)
  );
  check(
    'ProductImageUploader writes imageUrl from state, not a form field',
    /name=\{`image_\$\{index\}_url`\}/.test(productUploader)
  );
  check(
    'ProductImageUploader keeps alt text in that same state',
    /setAltTextAt/.test(productUploader) &&
      /name=\{`image_\$\{index\}_alt`\}/.test(productUploader)
  );

  for (const file of [
    'app/(admin)/admin/(dashboard)/kategori/CategoryImageUploader.tsx',
    'app/(admin)/admin/(dashboard)/galeri/GalleryImageUploader.tsx',
    'app/(admin)/admin/(dashboard)/pengaturan/SiteImageUploader.tsx',
  ]) {
    const source = readFileSync(file, 'utf8');
    check(`${file}: image lives in React state`, /const \[image, setImage\] = useState/.test(source));
    check(`${file}: submits imageUrl via a hidden field`, /type="hidden"[\s\S]{0,80}name=/.test(source));
  }
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);