/**
 * Browser verification of the product image lightbox.
 *
 * Uses the Chrome DevTools Protocol over Node's built-in WebSocket — the same
 * no-dependency approach as `test-row-cap-browser.mts`, and deliberately NOT a
 * Vitest suite: `vitest.config.mts` is node-only by design, and a mounted
 * component test would need jsdom + testing-library, which this project has
 * chosen not to adopt.
 *
 * Verifies the interaction rules static checks cannot:
 *   - clicking the main image opens a dialog
 *   - the dialog covers the VIEWPORT (the portal requirement)
 *   - the photo is not cropped and keeps its aspect ratio
 *   - prev/next buttons and the "n / m" indicator
 *   - ArrowLeft / ArrowRight / Escape, including wrap-around
 *   - clicking the photo does NOT close; clicking the backdrop DOES
 *   - focus moves into the dialog on open and returns on close
 *   - the page behind is scroll-locked while open
 *
 *   npx tsx verify-lightbox.mts
 *
 * PREREQUISITES (this script cannot run without them)
 *   1. A server already listening on BASE_URL (default http://localhost:3000).
 *   2. Chrome, at CHROME_PATH if set, otherwise the standard Windows install.
 *   3. A product published at slug `lightbox-verify-luna` with exactly four
 *      images — the assertions below check `1 / 4` and `4 / 4`. This script
 *      neither creates nor deletes that row: seed it, run, remove it.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = 'http://localhost:3000';
const PAGE = `${BASE}/produk/lightbox-verify-luna`;
const CHROME =
  process.env.CHROME_PATH ??
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// ─── Shapes read back out of the page ─────────────────────────────────────────

interface PreState {
  title: string;
  mainBtn: boolean;
  thumbs: number;
  dialogBefore: boolean;
}

interface Size {
  w: number;
  h: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface OpenedDialog {
  open: boolean;
  parentIsBody: boolean;
  role: string | null;
  ariaModal: string | null;
  rect: Rect;
  imgNatural: [number, number] | null;
  imgRendered: Size | null;
  focused: string | null;
  counter: string | null;
  closeBtn: boolean;
  prevBtn: boolean;
  nextBtn: boolean;
  viewport: Size;
}

/** Minimal shape of the CDP target entry this script needs. */
interface CdpTarget {
  type: string;
  webSocketDebuggerUrl?: string;
}

interface CdpResponse {
  id?: number;
  result?: {
    result?: { value?: unknown };
    exceptionDetails?: unknown;
  };
}

let failures = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const profile = mkdtempSync(join(tmpdir(), 'lb-chrome-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--remote-debugging-port=9333',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

async function connect(): Promise<string> {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9333/json/list');
      const targets = (await res.json()) as CdpTarget[];
      const page = targets.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* Chrome not listening yet */
    }
    await sleep(250);
  }
  throw new Error('Chrome tidak merespons pada port 9333');
}

const wsUrl = await connect();
const ws = new WebSocket(wsUrl);
await new Promise<void>((r) => {
  ws.onopen = () => r();
});

let id = 0;
const pending = new Map<number, (msg: CdpResponse) => void>();

ws.onmessage = (e: MessageEvent) => {
  const msg = JSON.parse(String(e.data)) as CdpResponse;
  if (msg.id !== undefined && pending.has(msg.id)) {
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
  }
};

const send = (
  method: string,
  params: Record<string, unknown> = {}
): Promise<CdpResponse> =>
  new Promise((res) => {
    const n = ++id;
    pending.set(n, res);
    ws.send(JSON.stringify({ id: n, method, params }));
  });

/**
 * Evaluates an expression in the page and returns its value.
 *
 * The type parameter is supplied by the caller because CDP returns whatever the
 * expression produced; the snippets below are page-local probes, and their
 * shapes are declared alongside them rather than collapsed into `any`.
 */
async function evaluate<T>(expression: string): Promise<T> {
  const r = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.result?.exceptionDetails) {
    throw new Error(JSON.stringify(r.result.exceptionDetails));
  }
  return r.result?.result?.value as T;
}

const dialogOpen = (): Promise<boolean> =>
  evaluate<boolean>(`!!document.querySelector('[role="dialog"]')`);

/** The "n / m" indicator, normalised so spacing differences cannot fail a check. */
const counterText = (): Promise<string | null> =>
  evaluate<string | null>(
    `document.querySelector('[role="dialog"]')?.textContent?.match(/\\d+\\s*\\/\\s*\\d+/)?.[0]?.replace(/\\s+/g,' ') ?? null`
  );

/** Waits until the dialog's photo has decoded, so its box can be measured. */
async function waitForDialogImage(): Promise<void> {
  for (let i = 0; i < 40; i++) {
    const ready = await evaluate<boolean>(
      `(() => { const i = document.querySelector('[role="dialog"] img'); return !!i && i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().width > 0; })()`
    );
    if (ready) return;
    await sleep(250);
  }
}

async function pressKey(k: string, code: string, keyCode: number): Promise<void> {
  for (const type of ['keyDown', 'keyUp']) {
    await send('Input.dispatchKeyEvent', {
      type,
      key: k,
      code,
      windowsVirtualKeyCode: keyCode,
      nativeVirtualKeyCode: keyCode,
    });
  }
  await sleep(220);
}

const clickAt = async (x: number, y: number): Promise<void> => {
  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x, y, button: 'left', clickCount: 1,
  });
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x, y, button: 'left', clickCount: 1,
  });
  await sleep(260);
};

const openLightbox = async (): Promise<void> => {
  await evaluate<boolean>(
    `document.querySelector('button[aria-label^="Perbesar foto"]').click()`
  );
  await sleep(400);
};

const focusedLabel = (): Promise<string> =>
  evaluate<string>(
    `(() => { const a = document.activeElement; return a ? (a.getAttribute('aria-label') ?? a.tagName) : '(none)'; })()`
  );

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: PAGE });
  await sleep(3500);

  // ── Preconditions ──────────────────────────────────────────────────────────
  const pre = await evaluate<PreState>(`(() => ({
    title: document.title,
    mainBtn: !!document.querySelector('button[aria-label^="Perbesar foto"]'),
    thumbs: document.querySelectorAll('[role="tab"]').length,
    dialogBefore: !!document.querySelector('[role="dialog"]'),
  }))()`);

  console.log('\nPra-kondisi:', JSON.stringify(pre));
  check('halaman produk termuat', pre.title.includes('LUNA'), pre.title);
  check('gambar utama bisa diklik (button)', pre.mainBtn);
  check('4 thumbnail dirender', pre.thumbs === 4, `jumlah=${pre.thumbs}`);
  check('lightbox tertutup saat halaman dimuat', pre.dialogBefore === false);

  // ── 1. Klik gambar utama → terbuka ─────────────────────────────────────────
  await openLightbox();
  await waitForDialogImage();

  const opened = await evaluate<OpenedDialog>(`(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return { open: false };
    const r = d.getBoundingClientRect();
    const img = d.querySelector('img');
    const ir = img?.getBoundingClientRect();
    return {
      open: true,
      parentIsBody: d.parentElement === document.body,
      role: d.getAttribute('role'),
      ariaModal: d.getAttribute('aria-modal'),
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      imgNatural: img ? [img.naturalWidth, img.naturalHeight] : null,
      imgRendered: ir ? { w: ir.width, h: ir.height } : null,
      focused: document.activeElement?.getAttribute('aria-label') ?? null,
      counter: d.textContent?.match(/\\d+\\s*\\/\\s*\\d+/)?.[0]?.replace(/\\s+/g, ' ') ?? null,
      closeBtn: !!d.querySelector('[aria-label="Tutup tampilan foto"]'),
      prevBtn: !!d.querySelector('[aria-label="Foto sebelumnya"]'),
      nextBtn: !!d.querySelector('[aria-label="Foto berikutnya"]'),
      viewport: { w: window.innerWidth, h: window.innerHeight },
    };
  })()`);

  console.log('\nSetelah diklik:', JSON.stringify(opened));
  check('dialog terbuka', opened.open);
  check('dialog dirender di body (portal)', opened.parentIsBody);
  check('role=dialog + aria-modal=true', opened.role === 'dialog' && opened.ariaModal === 'true');
  check(
    'MENUTUPI viewport',
    opened.rect.w === opened.viewport.w && opened.rect.h === opened.viewport.h,
    `dialog=${opened.rect.w}x${opened.rect.h} viewport=${opened.viewport.w}x${opened.viewport.h}`
  );
  check(
    'gambar tidak terpotong (max 88vh)',
    (opened.imgRendered?.h ?? 0) > 0 && (opened.imgRendered?.h ?? 0) <= 0.89 * opened.viewport.h,
    `tinggi=${opened.imgRendered?.h} dari ${opened.viewport.h}`
  );

  const renderedRatio = (opened.imgRendered?.w ?? 0) / (opened.imgRendered?.h ?? 1);
  const naturalRatio = (opened.imgNatural?.[0] ?? 0) / (opened.imgNatural?.[1] ?? 1);
  check(
    'proporsional (rasio terjaga)',
    Math.abs(renderedRatio - naturalRatio) < 0.02,
    `render=${renderedRatio.toFixed(3)} asli=${naturalRatio.toFixed(3)}`
  );
  check('tombol close ada', opened.closeBtn);
  check('tombol prev/next ada (4 foto)', opened.prevBtn && opened.nextBtn);
  check('indikator posisi 1 / 4', opened.counter?.trim() === '1 / 4', String(opened.counter));
  check('fokus masuk ke dialog', opened.focused === 'Tutup tampilan foto', String(opened.focused));

  // ── 2. Panah kiri/kanan ────────────────────────────────────────────────────
  await pressKey('ArrowRight', 'ArrowRight', 39);
  check('ArrowRight → foto 2', (await counterText())?.trim() === '2 / 4', String(await counterText()));

  await pressKey('ArrowRight', 'ArrowRight', 39);
  await pressKey('ArrowRight', 'ArrowRight', 39);
  await pressKey('ArrowRight', 'ArrowRight', 39);
  check('ArrowRight membungkus 4 → 1', (await counterText())?.trim() === '1 / 4', String(await counterText()));

  await pressKey('ArrowLeft', 'ArrowLeft', 37);
  check('ArrowLeft membungkus 1 → 4', (await counterText())?.trim() === '4 / 4', String(await counterText()));

  // ── 3. Klik gambar = TIDAK menutup ─────────────────────────────────────────
  // Wait for the newly shown photo to decode first: a still-loading <img> has a
  // 0x0 box, and a click at its centre would land on the close button instead.
  await waitForDialogImage();
  const imgBox = await evaluate<Rect>(
    `(() => { const r = document.querySelector('[role="dialog"] img').getBoundingClientRect();
       return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), w: Math.round(r.width), h: Math.round(r.height) }; })()`
  );
  console.log('  (klik di tengah gambar:', JSON.stringify(imgBox), ')');
  await clickAt(imgBox.x, imgBox.y);
  check('klik gambar TIDAK menutup lightbox', (await dialogOpen()) === true);

  // ── 4. Klik area gelap = menutup ───────────────────────────────────────────
  const vp = await evaluate<Size>(`({ w: window.innerWidth, h: window.innerHeight })`);
  await clickAt(vp.w - 6, vp.h - 6);
  check('klik area gelap MENUTUP lightbox', (await dialogOpen()) === false);

  await sleep(250);
  const afterBackdrop = await focusedLabel();
  check('fokus kembali ke gambar utama (tutup via backdrop)', afterBackdrop.startsWith('Perbesar foto'), afterBackdrop);

  // ── 5. Escape menutup ──────────────────────────────────────────────────────
  await openLightbox();
  await pressKey('Escape', 'Escape', 27);
  check('Escape menutup lightbox', (await dialogOpen()) === false);

  await sleep(250);
  const afterEscape = await focusedLabel();
  check('fokus kembali ke gambar utama (tutup via Escape)', afterEscape.startsWith('Perbesar foto'), afterEscape);

  // ── 6. Thumbnail tetap bekerja & lightbox mengikuti ─────────────────────────
  await evaluate<boolean>(`document.querySelectorAll('[role="tab"]')[2].click()`);
  await sleep(300);
  const mainLabel = await evaluate<string | null>(
    `document.querySelector('button[aria-label^="Perbesar foto"]')?.getAttribute('aria-label')`
  );
  check('klik thumbnail mengubah gambar utama', mainLabel?.includes('foto 3') === true, String(mainLabel));

  await openLightbox();
  check('lightbox terbuka pada thumbnail aktif (3 / 4)', (await counterText())?.trim() === '3 / 4', String(await counterText()));
  await pressKey('Escape', 'Escape', 27);

  // ── 7. Scroll terkunci ─────────────────────────────────────────────────────
  await openLightbox();
  const locked = await evaluate<string>(`getComputedStyle(document.body).overflow`);
  check('scroll halaman terkunci saat lightbox terbuka', locked === 'hidden', locked);

  await pressKey('Escape', 'Escape', 27);
  await sleep(300);
  const unlocked = await evaluate<string>(`getComputedStyle(document.body).overflow`);
  check('scroll halaman dilepas setelah ditutup', unlocked !== 'hidden', `"${unlocked}"`);

  console.log(`\n${failures === 0 ? 'SEMUA LULUS' : `${failures} CHECK GAGAL`}`);
} catch (err) {
  console.error('ERROR:', err);
  failures++;
} finally {
  try {
    ws.close();
  } catch {
    /* already closed */
  }
  chrome.kill();
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
}

process.exit(failures === 0 ? 0 : 1);