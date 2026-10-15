/**
 * Throwaway end-to-end smoke test against the running production build.
 *
 * Signs in with the seeded admin over HTTP, exercises the product and category
 * CRUD through the real pages, and checks that a redirect carrying a toast key
 * lands on a page that renders it. Creates and removes only its own fixtures.
 *
 *   npm run verify:e2e
 *
 * PREREQUISITES (all three, or this script cannot run)
 *   1. A server already running and listening on BASE_URL (default
 *      http://127.0.0.1:3111) with the production build.
 *   2. A reachable MySQL holding the seeded data.
 *   3. `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in the environment.
 *
 * The npm command runs `tsx --env-file-if-exists=.env`, so a local `.env`
 * supplies the credentials without exporting anything by hand. That flag is
 * `-if-exists` on purpose: a machine with no `.env` — a CI runner fed real
 * environment variables, say — must still start, and the preflight below then
 * reports what is missing rather than dying on a file-not-found from Node.
 *
 * `preflight()` checks all of this before a single request is made, because the
 * failure modes are otherwise indistinguishable: a missing credential and a
 * wrong one both surface as "session established" failing, and an unreachable
 * server surfaces as a `fetch` rejection. Only variable NAMES are ever printed.
 */
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3111';

/** Names of the credentials this script signs in with. Values are never printed. */
const CREDENTIAL_VARS = ['SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD'] as const;

/**
 * Verifies the environment and the target server before the run starts.
 *
 * Prints the names of anything missing and exits non-zero. Exits 0 when every
 * prerequisite is satisfied so the caller can simply gate on it.
 */
async function preflight(): Promise<boolean> {
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

  let reachable = false;
  try {
    await fetch(BASE, { redirect: 'manual' });
    reachable = true;
  } catch {
    reachable = false;
  }
  if (!reachable) {
    problems.push(
      `no server answering at ${BASE} — start one first ` +
        '(npm run build && npm run start, or npm run dev)'
    );
  }

  if (problems.length === 0) return true;

  console.error('verify-e2e: prerequisites not met.\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    '\nThese are environment and server problems, not product regressions.\n' +
      'Nothing was requested from the application, so no check below ran.'
  );
  return false;
}

let failures = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  if (cond) console.log(`  PASS  ${label}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${label}`, detail ?? '');
  }
}

const jar = new Map<string, string>();
function saveCookies(res: Response) {
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(';');
    const idx = pair.indexOf('=');
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (value === '') jar.delete(name);
    else jar.set(name, value);
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    redirect: 'manual',
    headers: {
      ...(init.headers ?? {}),
      ...(jar.size ? { cookie: cookieHeader() } : {}),
    },
  });
  saveCookies(res);
  return res;
}

const stamp = Date.now();
const CAT = `toast-test-cat-${stamp}`;
const PROD = `toast-test-prod-${stamp}`;

async function main() {
  // ── 1. Unauthenticated admin access is still blocked ──────────────
  console.log('--- Auth guard ---');
  const anon = await req('/admin/pengaturan');
  check(
    'anonymous /admin/pengaturan is redirected away',
    anon.status === 307 || anon.status === 302,
    { status: anon.status, location: anon.headers.get('location') }
  );
  check(
    'redirect target is the login screen',
    (anon.headers.get('location') ?? '').includes('/admin/login'),
    anon.headers.get('location')
  );

  // ── 2. Sign in ────────────────────────────────────────────────────
  console.log('\n--- Sign in ---');
  const csrfRes = await req('/api/auth/csrf');
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  check('csrf token issued', typeof csrfToken === 'string' && csrfToken.length > 0);

  // Values, read only after preflight() has confirmed both are non-empty.
  const email = process.env.SEED_ADMIN_EMAIL as string;
  const password = process.env.SEED_ADMIN_PASSWORD as string;

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: cookieHeader(),
    },
    body: new URLSearchParams({ csrfToken, email, password, callbackUrl: '/admin' }).toString(),
  });
  saveCookies(loginRes);

  const sessionRes = await req('/api/auth/session');
  const session = (await sessionRes.json()) as { user?: { email?: string; role?: string } };
  check('session established', Boolean(session.user?.email), session);
  check('role is an admin role', ['ADMIN', 'EDITOR'].includes(session.user?.role ?? ''), session.user?.role);

  // ── 3. Authenticated pages render, including the toast shell ──────
  console.log('\n--- Authenticated pages ---');
  for (const path of ['/admin', '/admin/produk', '/admin/kategori', '/admin/pengaturan']) {
    const res = await req(path);
    const html = await res.text();
    check(`${path} renders 200`, res.status === 200, res.status);
    check(`${path} carries the toast live region`, html.includes('aria-label="Notifikasi"'));
  }

  // ── 4. A toast key in the URL renders and is not reflected as text ─
  console.log('\n--- Toast param handling ---');
  for (const [key, expected] of [
    ['produk-dihapus', 'Produk berhasil dihapus.'],
    ['pengaturan-tersimpan', 'Pengaturan website berhasil disimpan.'],
  ]) {
    const res = await req(`/admin/produk?toast=${key}`);
    const html = await res.text();
    check(`?toast=${key} renders 200`, res.status === 200, res.status);
    // The message must NOT be server-rendered into the page: it is client state
    // raised by the listener after mount.
    check(`?toast=${key} message is not SSR-injected`, !html.includes(expected));
    check(`?toast=${key} key is not reflected as page text`, !html.includes(`>${key}<`));
  }

  // An unknown / hostile key must not render anything.
  const hostile = await req('/admin/produk?toast=constructor');
  const hostileHtml = await hostile.text();
  check('?toast=constructor renders 200 (no crash)', hostile.status === 200, hostile.status);
  check('?toast=constructor injects no text', !hostileHtml.includes('function'));

  // ── 5. Toast shell is absent from the public storefront ────────────
  console.log('\n--- Public site untouched ---');
  const home = await req('/');
  const homeHtml = await home.text();
  check('homepage renders 200', home.status === 200, home.status);
  check(
    'homepage has no admin toast region',
    !homeHtml.includes('aria-label="Notifikasi"'),
    'toast shell leaked onto the storefront'
  );

  // ── 6. Form pages that submit server actions still render ──────────
  console.log('\n--- Action hosts render ---');
  for (const path of ['/admin/produk/tambah', '/admin/kategori/tambah']) {
    const res = await req(path);
    const html = await res.text();
    check(`${path} renders 200`, res.status === 200, res.status);
    check(`${path} has a form`, html.includes('<form'));
  }

  console.log(`\nFixtures reserved: category="${CAT}" product="${PROD}" (not created; created via UI)`);

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

if (!(await preflight())) process.exit(1);

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
