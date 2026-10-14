/**
 * Measures the client-side JavaScript the homepage actually ships.
 *
 * Reads the `(store)/page_client-reference-manifest.js` that `next build`
 * emits, takes the chunk files it points at, and reports raw + gzip totals.
 *
 * This is the exact module->chunk graph the browser fetches for `/`, so the
 * number moves only when the client bundle moves. It does not need a database,
 * which is why it still works in an environment where prerendering cannot run.
 *
 * Usage: node scripts/measure-home-client.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync, constants } from 'node:zlib';
import { join } from 'node:path';

const ROOT = process.cwd();
const MANIFEST = join(
  ROOT,
  '.next',
  'server',
  'app',
  '(store)',
  'page_client-reference-manifest.js'
);

if (!existsSync(MANIFEST)) {
  console.error(`Missing ${MANIFEST}. Run \`next build\` first.`);
  process.exit(1);
}

// Turbopack emits `globalThis.__RSC_MANIFEST["/(store)/page"] = {...}`.
// Evaluate it in a sandbox to recover the real structure rather than trying to
// regex it out of the source.
const source = readFileSync(MANIFEST, 'utf8');
const sandbox = { globalThis: {} };
new Function('globalThis', source)(sandbox.globalThis);
const manifest = sandbox.globalThis.__RSC_MANIFEST['/(store)/page'];

const clientModules = Object.keys(manifest.clientModules ?? {});

const chunks = new Map();
for (const mod of clientModules) {
  for (const url of manifest.clientModules[mod].chunks ?? []) {
    // URLs look like "/_next/static/chunks/<file>.js".
    const file = url.split('/').pop();
    if (!chunks.has(file)) chunks.set(file, new Set());
    chunks.get(file).add(mod);
  }
}

const rows = [];
let rawTotal = 0;
let gzipTotal = 0;

for (const [file, mods] of chunks) {
  const abs = join(ROOT, '.next', 'static', 'chunks', file);
  if (!existsSync(abs)) continue;
  const bytes = readFileSync(abs);
  const gz = gzipSync(bytes, { level: constants.Z_BEST_COMPRESSION }).length;
  rawTotal += bytes.length;
  gzipTotal += gz;
  rows.push({ file, raw: bytes.length, gzip: gz, modules: mods.size });
}

rows.sort((a, b) => b.raw - a.raw);

const kb = (n) => (n / 1024).toFixed(1).padStart(8);

console.log(`Homepage client chunks: ${rows.length}`);
console.log('  raw KB      gzip KB   modules  chunk');
for (const r of rows) {
  console.log(
    `${kb(r.raw)}  ${kb(r.gzip)}   ${String(r.modules).padStart(7)}  ${r.file}`
  );
}
console.log(`${'-'.repeat(60)}`);
console.log(`TOTAL raw ${(rawTotal / 1024).toFixed(1)} KB / gzip ${(gzipTotal / 1024).toFixed(1)} KB`);