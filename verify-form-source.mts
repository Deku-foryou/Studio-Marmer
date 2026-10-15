/**
 * Static invariant check over the admin form sources.
 *
 * The React 19 form reset (see verify-form-reset.mts) is neutralised per control
 * type in different ways, and it is easy to reintroduce the bug later by adding
 * one `defaultValue` to a new field. This asserts the shape directly on the real
 * source files, so a regression fails here rather than in a browser.
 *
 *     npx tsx verify-form-source.mts      # or: npm run verify:forms
 *
 * Two rules this file deliberately does NOT enforce, because the surrounding code
 * contradicts them:
 *
 *   - `type="hidden"` inputs do not need an `onChange`. Every uploader holds its
 *     media in React state and mirrors it into a hidden field purely to submit it.
 *     A hidden input has nothing for the admin to interact with, so requiring a
 *     handler would flag the pattern this file's own last check endorses.
 *   - Checkboxes do not carry a `value` prop. The browser's default checkbox
 *     value is `"on"`, and every server action depends on exactly that:
 *     `produk/actions.ts` (`isAvailable`/`isUniquePiece`/`isFeatured`/
 *     `whatsappEnabled`), `kategori/actions.ts` and `galeri/actions.ts`
 *     (`isActive`) all read `formData.get(<name>) === 'on'`. Adding a `value` to
 *     one of these inputs would silently break that read, not fix anything.
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

/**
 * Finds the `>` that closes an opening tag, starting from just after the tag name.
 *
 * A regex such as `/<(input|select|textarea)\b([^>]*?)\/?>/` cannot do this: it
 * stops at the first `>` it finds, and every controlled input in this codebase has
 * an `onChange={(e) => ...}` whose arrow swallows that character. The attribute
 * capture would end mid-expression, silently hiding every attribute after it —
 * including `key`, which is exactly what the checkbox and select checks assert on.
 *
 * So the tag is scanned by hand instead, tracking only what can actually appear
 * inside a JSX attribute list:
 *
 *   - `{}` nesting, so a `>` inside any expression is ignored at depth > 0;
 *   - `"`, `'` and `` ` `` string literals, so a `>` inside a string is ignored;
 *   - backslash escapes inside those literals.
 *
 * `${...}` inside a template literal needs no special case: its braces balance,
 * so the depth counter stays correct on its own.
 *
 * @returns the index of the closing `>`, or -1 when the tag is never closed.
 */
function findTagEnd(source: string, from: number): number {
  let depth = 0;
  let quote: string | null = null;

  for (let i = from; i < source.length; i += 1) {
    const char = source[i];

    if (quote !== null) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      if (depth > 0) depth -= 1;
    } else if (char === '>' && depth === 0) {
      return i;
    }
  }

  return -1;
}

/** Every opening tag for a form control, with its attributes. */
function controlTags(source: string): { name: string; tag: string; attrs: string }[] {
  const out: { name: string; tag: string; attrs: string }[] = [];
  // The lookahead keeps `<input` from matching a longer tag name, and the
  // closing `</input>` cannot match at all because of the literal `<`.
  const pattern = /<(input|select|textarea)(?=[\s/>])/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const attrsStart = match.index + match[0].length;
    const end = findTagEnd(source, attrsStart);
    if (end === -1) break;

    const attrs = source.slice(attrsStart, end);
    const nameMatch = /\bname=\{?[`'"]([^`'"]+)[`'"]/.exec(attrs);
    out.push({ name: nameMatch ? nameMatch[1] : '', tag: match[1], attrs });

    // Resume after the tag so its inner markup is not rescanned for controls.
    pattern.lastIndex = end;
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

/**
 * True for the input types that are deliberately not controlled from React:
 *
 *   - `file` — a browser cannot repopulate a file picker, and it holds no value
 *     that needs preserving;
 *   - `hidden` — driven from React state to be submitted, never edited. It is
 *     still subject to the `defaultValue` check below, since a hidden field set
 *     with `defaultValue` would suffer the same React 19 reset as any other.
 */
function isUncontrolledInputType(attrs: string): boolean {
  return /type="file"/.test(attrs) || /type="hidden"/.test(attrs);
}

console.log('--- No uncontrolled defaultValue inputs remain ---');
for (const file of FORMS) {
  const source = stripComments(readFileSync(file, 'utf8'));
  const controls = controlTags(source);

  const offenders = controls.filter(
    (control) => control.tag === 'input' && !isUncontrolledInputType(control.attrs) && hasDefaultValue(control.attrs)
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

  // Hidden inputs are excluded: they carry a value with no handler by design,
  // so requiring `onChange` on them would flag the uploader pattern itself.
  const incomplete = controls.filter(
    (control) =>
      control.tag === 'input' &&
      !isUncontrolledInputType(control.attrs) &&
      hasValueProp(control.attrs) &&
      !hasOnChange(control.attrs)
  );

  check(
    `${file}: every visible valued input has an onChange`,
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

  // No `value` requirement: the actions read these as `=== 'on'`, which is the
  // browser default for a checkbox that does not set one.
  const broken = checkboxes.filter(
    (control) =>
      !/checked=\{/.test(control.attrs) || !hasOnChange(control.attrs) || !hasKey(control.attrs)
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
      !hasValueProp(control.attrs) || !hasOnChange(control.attrs) || !hasKey(control.attrs)
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