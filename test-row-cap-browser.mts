/**
 * Browser check of the row-cap UI.
 *
 * Two things the unit tests cannot show:
 *   1. The "Tambah Baris" control actually stops at MAX_PRODUCT_ROWS and shows
 *      the hint (a state bug in the component would pass every schema test).
 *   2. A 27-row submission built through the real form is rejected by the
 *      server and the message is rendered against the field.
 *
 * Signed in via the real login form; the product form is filled with plain text
 * fields only, so no Cloudinary upload is involved. Every 27-row submission is
 * rejected before any database write, so this creates nothing.
 *
 *   npm run test:row-cap-browser
 *
 * PREREQUISITES (all three, or this script cannot run)
 *   1. A dev server already listening on BASE_URL (default http://localhost:3000).
 *   2. Chrome, at CHROME_PATH if set, otherwise the standard Windows install.
 *   3. `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in the environment.
 *
 * The npm command runs `tsx --env-file-if-exists=.env`, so a local `.env`
 * supplies the credentials without exporting anything by hand. That flag is
 * `-if-exists` on purpose: a machine with no `.env` — a CI runner fed real
 * environment variables, say — must still start, and the preflight below then
 * reports what is missing rather than dying on a file-not-found from Node.
 *
 * `preflight()` runs BEFORE Chrome is launched, so a missing prerequisite costs
 * one console message instead of a headless browser process and a login form
 * filled with empty strings. Only variable NAMES are ever printed.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const CHROME =
  process.env.CHROME_PATH ??
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9340;
const MAX = 26;

/** Names of the credentials this script signs in with. Values are never printed. */
const CREDENTIAL_VARS = ['SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD'] as const;

/**
 * Verifies the environment, the browser and the target server before Chrome
 * starts. Exits non-zero with the names of anything missing; exits 0 when every
 * prerequisite is satisfied.
 */
async function preflight(): Promise<void> {
  const problems: string[] = [];

  const missing = CREDENTIAL_VARS.filter(
    (name) => (process.env[name] ?? '').trim() === ''
  );
  if (missing.length > 0) {
    problems.push(
      `missing or empty environment variable(s): ${missing.join(', ')} ` +
        '(names only — values are never printed)'
    );
  }

  if (!existsSync(CHROME)) {
    problems.push(
      `no browser at ${CHROME} — set CHROME_PATH to a Chrome or Edge executable`
    );
  }

  try {
    await fetch(BASE, { redirect: 'manual' });
  } catch {
    problems.push(
      `no server answering at ${BASE} — start one first (npm run dev)`
    );
  }

  if (problems.length === 0) return;

  console.error('test-row-cap-browser: prerequisites not met.\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    '\nThese are environment and tooling problems, not product regressions.\n' +
      'No browser was launched and nothing was submitted.'
  );
  process.exit(1);
}

await preflight();

let failures = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  if (cond) console.log(`  PASS  ${label}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${label}`, detail ?? '');
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForDevTools(): Promise<string> {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      return ((await res.json()) as { webSocketDebuggerUrl: string }).webSocketDebuggerUrl;
    } catch { await sleep(250); }
  }
  throw new Error('devtools unavailable');
}

/**
 * A value produced by `Runtime.evaluate` with `returnByValue: true`.
 *
 * CDP serialises whatever the expression evaluated into JSON, so the honest type
 * is "some JSON value". This union covers everything the checks below actually
 * evaluate: pathnames, row counts, booleans, and short marker strings.
 */
type CdpValue = string | number | boolean | null | undefined;

/**
 * The payload a CDP command resolves with.
 *
 * `result.value` carries an evaluated value and `exceptionDetails` marks an
 * error thrown inside the page. The index signature is not optional decoration:
 * result payloads are method-specific — `Target.createTarget` answers
 * `{ targetId }`, `Target.attachToTarget` answers `{ sessionId }` — so they
 * cannot be enumerated here without pretending to model the whole protocol.
 */
type CdpPayload = {
  result?: { value?: CdpValue };
  exceptionDetails?: { text?: string };
} & Record<string, unknown>;

/** `eval()` yields a raw value, or the message of a page-side exception. */
type EvalResult = CdpValue | { __err?: string };

class Cdp {
  private ws!: WebSocket; private id = 0;
  private pending = new Map<number, (v: CdpPayload) => void>();
  async connect(url: string) {
    this.ws = new WebSocket(url);
    await new Promise<void>((res, rej) => { this.ws.onopen = () => res(); this.ws.onerror = rej; });
    this.ws.onmessage = (e) => {
      const m = JSON.parse(String(e.data));
      if (m.id !== undefined) { this.pending.get(m.id)?.(m.result ?? m.error); this.pending.delete(m.id); }
    };
  }
  send(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<CdpPayload> {
    const id = ++this.id;
    return new Promise<CdpPayload>((r) => { this.pending.set(id, r); this.ws.send(JSON.stringify({ id, method, params, sessionId })); });
  }
  async eval(e: string, s?: string): Promise<EvalResult> {
    const r = await this.send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }, s);
    if (r?.exceptionDetails) return { __err: r.exceptionDetails.text };
    return r?.result?.value;
  }
  close() { this.ws.close(); }
}

const dir = mkdtempSync(join(tmpdir(), 'rowcap-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });

try {
  const b = new Cdp();
  await b.connect(await waitForDevTools());
  const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' });
  const attached = await b.send('Target.attachToTarget', { targetId, flatten: true });
  // The protocol always answers a string here, but it arrives as untyped JSON.
  // Narrowing it once — rather than casting at every call — keeps the rest of
  // the script free of casts and still fails loudly if that ever changes.
  const sessionId = typeof attached.sessionId === 'string' ? attached.sessionId : undefined;
  await b.send('Runtime.enable', {}, sessionId);
  await b.send('Page.enable', {}, sessionId);

  // ── Sign in ─────────────────────────────────────────────────────────
  console.log('--- Sign in ---');
  await b.send('Page.navigate', { url: `${BASE}/admin/login` }, sessionId);
  for (let i = 0; i < 60; i++) {
    const ok = await b.eval(`document.querySelectorAll('input[type="email"], input[type="password"]').length >= 2`, sessionId);
    if (ok === true) break;
    await sleep(500);
  }
  await sleep(3000); // hydration
  // Read once, after preflight() has confirmed both are non-empty. These are
  // interpolated into the expression below, which travels to the page over the
  // DevTools websocket; they are never written to stdout.
  const adminEmail = process.env.SEED_ADMIN_EMAIL as string;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD as string;
  await b.eval(`(() => {
    const set = (el, v) => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const i = document.querySelectorAll('input[type="email"], input[type="password"]');
    const f = i[0].closest('form');
    set(i[0], ${JSON.stringify(adminEmail)});
    set(i[1], ${JSON.stringify(adminPassword)});
    f.requestSubmit();
    return 'ok';
  })()`, sessionId);
  let path: string = '/admin/login';
  for (let i = 0; i < 30; i++) { await sleep(1000); path = String(await b.eval('location.pathname', sessionId)); if (path !== '/admin/login') break; }
  check('signed in', path !== '/admin/login', path);
  console.log(`  at ${path}`);

  // ── The add control caps at MAX ─────────────────────────────────────
  console.log('\n--- "Tambah Baris" caps at the limit ---');
  await b.send('Page.navigate', { url: `${BASE}/admin/produk/tambah` }, sessionId);
  for (let i = 0; i < 60; i++) {
    const ok = await b.eval(`!!document.querySelector('input[name="name"]')`, sessionId);
    if (ok === true) break;
    await sleep(500);
  }
  await sleep(3500); // hydration

  const countRows = () => b.eval(
    `document.querySelectorAll('input[name^="spec_"][name$="_label"]').length`, sessionId);

  const initial = await countRows();
  console.log(`  rows on load: ${initial}`);
  check('form starts with a small number of rows', Number(initial) < MAX, initial);

  // Click "Tambah Baris" until it stops growing.
  const clicked = await b.eval(`(async () => {
    const btns = [...document.querySelectorAll('button')].filter(x => x.textContent.trim() === 'Tambah Baris');
    if (btns.length !== 1) return 'found ' + btns.length + ' buttons';
    for (let n = 0; n < 60; n++) {
      if (btns[0].disabled) break;
      btns[0].click();
      await new Promise(r => setTimeout(r, 12));
    }
    return 'done';
  })()`, sessionId);
  check('add button located', clicked === 'done', clicked);

  const capped = await countRows();
  console.log(`  rows after clicking to the cap: ${capped}`);
  check(`rows capped at ${MAX} (not more)`, Number(capped) === MAX, capped);
  check('never exceeded the cap', Number(capped) <= MAX, capped);

  const disabledAtCap = await b.eval(
    `(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Tambah Baris'); return b ? b.disabled : null; })()`,
    sessionId
  );
  check('add button is disabled at the cap', disabledAtCap === true, disabledAtCap);

  const hintShown = await b.eval(
    `document.body.innerText.includes('Batas 26 baris spesifikasi tercapai')`, sessionId);
  check('limit hint is displayed', hintShown === true, hintShown);

  // Removing a row frees capacity again.
  console.log('\n--- Removing a row re-enables adding ---');
  await b.eval(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => (x.getAttribute('aria-label')||'').startsWith('Hapus baris spesifikasi'));
    if (b) b.click();
    return 'clicked';
  })()`, sessionId);
  await sleep(600);
  const afterRemove = await countRows();
  const reEnabled = await b.eval(
    `(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Tambah Baris'); return b ? b.disabled : null; })()`,
    sessionId);
  console.log(`  rows after delete: ${afterRemove}, button disabled: ${reEnabled}`);
  check('rows went back below the cap', Number(afterRemove) === MAX - 1, afterRemove);
  check('add button re-enabled', reEnabled === false, reEnabled);

  // ── A 27-row submission is rejected server-side ────────────────────
  console.log('\n--- 27-row submission is rejected with a field message ---');
  // Fill the minimum a real submit needs (all text fields; no upload).
  const filled = await b.eval(`(() => {
    const set = (el, v) => {
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto,'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const byName = (n) => document.querySelector('input[name="'+n+'"], textarea[name="'+n+'"], select[name="'+n+'"]');
    const cat = byName('categoryId');
    if (cat && cat.tagName === 'SELECT') {
      // React-controlled: assigning .value directly is invisible to it, so the
      // native setter plus a change event is what actually updates the state.
      const opt = [...cat.options].find(o => o.value && o.value !== '');
      if (opt) {
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(cat, opt.value);
        cat.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    set(byName('name'), 'Produk Uji Batas Baris');
    set(byName('shortDescription'), 'Deskripsi singkat uji.');
    const d = byName('description');
    if (d) set(d, 'Deskripsi panjang untuk pengujian batas baris.');
    set(byName('price'), '185000');
    set(byName('stoneType'), 'Carrara');
    set(byName('color'), 'Putih');
    set(byName('dimensions'), '15x12x11');
    set(byName('weightGrams'), '2400');
    for (const el of document.querySelectorAll('input[name^="spec_"][name$="_label"]')) {
      const i = el.name.match(/spec_(\\d+)_label/)[1];
      set(el, 'Label ' + i);
      const v = document.querySelector('input[name="spec_'+i+'_value"]');
      if (v) set(v, 'Nilai ' + i);
    }
    return 'filled';
  })()`, sessionId);
  check('form filled', filled === 'filled', filled);
  await sleep(800);

  const before = await b.eval(`location.pathname`, sessionId);
  // Inject the extra rows and submit in ONE evaluation. React reconciles the
  // form on re-render and removes DOM nodes it did not create, so an injected
  // hidden input appended earlier would be gone by the time submit runs.
  const submitted = await b.eval(`(() => {
    const form = document.querySelector('input[name="name"]').closest('form');
    // One image row so the images min(1) rule is satisfied.
    const img = document.createElement('input');
    img.type = 'hidden'; img.name = 'image_0_url';
    img.value = 'https://res.cloudinary.com/demo/image/upload/v1/uji.png';
    form.appendChild(img);
    // A 27th specification row, bypassing the capped UI exactly as a crafted
    // request would.
    for (const [n, v] of [['spec_27_label','Latarang 27'],['spec_27_value','Nilai 27']]) {
      const el = document.createElement('input');
      el.type = 'hidden'; el.name = n; el.value = v;
      form.appendChild(el);
    }
    // Build the payload first, THEN submit: requestSubmit re-reads the DOM.
    const fd = new FormData(form);
    const probe = { spec27: fd.get('spec_27_label'), image0: fd.get('image_0_url'), cat: fd.get('categoryId') };
    form.requestSubmit();
    return JSON.stringify(probe);
  })()`, sessionId);
  console.log(`  payload probe: ${submitted}`);
  check('the 27th row really was in the submitted payload', /"spec27":"Latarang 27"/.test(String(submitted)), submitted);
  check('a category was selected (so only the limit can fail)', /"cat":"\d+"/.test(String(submitted)), submitted);
  await sleep(8000);

  const after = await b.eval(`location.pathname`, sessionId);
  console.log(`  path before: ${before}, after: ${after}`);
  check('stayed on the form (not redirected to the list)', after === '/admin/produk/tambah', after);

  // FieldError renders a plain <p> with no role, so read the whole page text
  // rather than only [role="alert"] nodes.
  const msgs = await b.eval(`document.body.innerText`, sessionId);
  console.log(`  page contains limit message: ${/Maksimal 26 baris spesifikasi/.test(String(msgs))}`);
  console.log(`  snippet: ${String(msgs).replace(/\s+/g, ' ').slice(0, 220)}`);
  // Dump every error-coloured node: FieldError renders a bare <p>, so class
  // matching is the only way to see WHICH field the server rejected.
  const allErrors = await b.eval(`(() => {
    const out = [];
    for (const el of document.querySelectorAll('p, span, div')) {
      const t = (el.textContent||'').trim();
      if (!t || t.length > 160) continue;
      if (el.className && String(el.className).includes('C4553D')) out.push(t);
    }
    return out;
  })()`, sessionId);
  console.log(`  error-coloured nodes: ${JSON.stringify(allErrors)}`);
  check(
    'the limit message is rendered to the admin',
    /Maksimal 26 baris spesifikasi/.test(String(msgs)),
    `no limit message; errors seen: ${JSON.stringify(allErrors)}`
  );
  check(
    'the generic banner is also shown (existing mechanism, unchanged)',
    /Periksa kembali data yang diisi\./.test(String(msgs)),
    'banner missing'
  );

  const keptName = await b.eval(`(() => { const n = document.querySelector('input[name="name"]'); return n ? n.value : null; })()`, sessionId);
  console.log(`  name field still holds: ${JSON.stringify(keptName)}`);
  check('entered data preserved after rejection', keptName === 'Produk Uji Batas Baris', keptName);

  b.close();
} finally {
  chrome.kill();
  try { rmSync(dir, { recursive: true, force: true }); } catch {}
}

console.log(failures === 0 ? '\nALL BROWSER CHECKS PASSED' : `\n${failures} BROWSER CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
