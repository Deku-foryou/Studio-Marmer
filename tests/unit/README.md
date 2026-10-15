# Unit tests

Vitest suite for the pure, side-effect-free modules of the application.

```bash
npm test          # run once (CI / before commit)
npm run test:watch # re-run on change
```

## What belongs here

Only code that can run **without** a database, a browser, a running server, or
environment variables. Every module under test imports `zod`, `node:crypto`, or
another local pure module — nothing reaches MySQL, Cloudinary or `AUTH_SECRET`.

All eight files below are matched by `include: ['tests/unit/**/*.test.ts']` and
run by `npm test` — 301 tests at the time of writing.

| File | Covers |
| --- | --- |
| `product.test.ts` | `createProductSchema`, `updateProductSchema`, required fields, numeric coercion, row limits, `specificationsToJson` |
| `category.test.ts` | Category create/update, gallery and site-media URL policy, the URL/`publicId` column resolvers |
| `media-url.test.ts` | `isAllowedMediaUrl`, `hasUnsafeUrlCharacters` |
| `product-rows.test.ts` | `findRowOverflow`, `overflowFieldErrors`, `MAX_PRODUCT_ROWS` |
| `credentials.test.ts` | `auth()` credential resolution, the role gate, the rate limiter on the login path |
| `crypto-and-roles.test.ts` | `hashPassword` / `verifyPassword`, `isAdminRole` |
| `media-lifecycle.test.ts` | Cloudinary asset lifecycle across product / category / gallery / site media |
| `rate-limiter.test.ts` | `lib/auth/rate-limiter.ts` windowing and per-IP accounting |

## What does NOT belong here, and where it lives instead

These are real checks, but they are not Vitest suites — they are standalone
`.mts` harnesses at the repository root. **None of them are run by `npm test`.**

The npm script names follow the file names: `test:*` runs a `test-*.mts`,
`verify:*` runs a `verify-*.mts`.

| Script | Command | External prerequisites | Status |
| --- | --- | --- | --- |
| `test-validation.mts` | `npm run test:scripts` | none | Fully superseded by this suite (see below) |
| `test-row-overflow.mts` | `npm run test:scripts` | none | Mostly superseded, but carries **one assertion Vitest does not have** (see below) |
| `test-row-limit-action.mts` | `npm run test:row-action` | none | Runs green, but cannot detect production regressions (see below) |
| `verify-form-reset.mts` | `npm run verify:form-reset` | none | Standalone; needs no server |
| `verify-form-source.mts` | `npm run verify:forms` | none | Static source check on the admin forms |
| `test-row-cap-browser.mts` | `npm run test:row-cap-browser` | **running dev server + real Chrome + signed-in admin** | Only coverage of the row-cap UI; keep |
| `verify-e2e.mts` | `npm run verify:e2e` | **running server + MySQL + seeded admin** | Smoke test; keep |

`test:row-cap-browser` and `verify:e2e` are the only two that cannot run in a bare
checkout. Both read `BASE_URL` from the environment (defaults `localhost:3000`
and `127.0.0.1:3111` respectively); the browser harness also reads `CHROME_PATH`
and defaults to the standard Windows Chrome install.

### `test-validation.mts` is a strict subset of this suite

An assertion-by-assertion comparison puts every one of its checks inside the
Vitest files above, and most of them inside a *stricter* form:

| `test-validation.mts` | Covered by |
| --- | --- |
| Specification bounds 0/1/25/26, `flatten().fieldErrors`, the `Maksimal 26` message | `product.test.ts` — row limits |
| Image bounds, same message assertion | `product.test.ts` — row limits |
| Create and update enforcing identical bounds | `product.test.ts` — create and update agree |
| Flag defaults, blank optionals, omitted `specifications` | `product.test.ts` — optional fields and defaults |
| The 14 `URL_CASES` through create **and** update category schemas | `category.test.ts` — the same table, both schemas |
| `isAllowedMediaUrl` over those same cases | `media-url.test.ts`, which also adds `vbscript:`, empty, whitespace-only, schemeless-host, backslash, port, query-string and userinfo cases |
| Whitespace-padded URL accepted **and** stored trimmed | `category.test.ts` — trims surrounding whitespace |
| The real seeded Cloudinary URL | `media-url.test.ts` — `hasUnsafeUrlCharacters` |

It is kept only because it costs nothing and is already wired to
`npm run test:scripts`. It is the strongest REMOVE candidate of the root scripts
if that cross-check is ever dropped.

### What `test-row-overflow.mts` still contributes

Almost all of it is duplicated by `product-rows.test.ts`, including the
blank-trailing-row cases, the url-less image slot, unrelated keys, and the
far-out index. Even the "schema alone would pass the truncated 26" case is
covered, by `product.test.ts` — *the schema limit alone cannot catch a truncated
submission*.

**One assertion is unique**, and it is the reason this script is not a duplicate:

```
--- Bounded work ---
  PASS  iterates exactly once over the entries
```

It feeds `findRowOverflow` a counting generator and asserts `seen === 26`, proving
the iterator is consumed exactly once. `product-rows.test.ts` proves the same
property only indirectly, with a wall-clock threshold
(`Date.now()` delta `< 1000`). The counting generator is deterministic; the timing
check is a heuristic that can pass on a slow machine and fail on a fast one.

> **Do not delete this script on the grounds that it duplicates
> `product-rows.test.ts`.** If that single assertion is to be kept, move it into
> `product-rows.test.ts` *first*, then the script can go.

One caveat in the same file, recorded so it is not mistaken for coverage: the
`update schema is reachable (sanity)` check evaluates
`parsed.success === false || parsed.success === true`, which is true for any
input and therefore asserts nothing. It is left in place rather than removed.

### `test-row-limit-action.mts` now tests the real parser

It used to **re-declare** the `readFormData` row loops rather than importing them,
because `readFormData` was private to `produk/actions.ts` — a `'use server'` module
that may only export async functions, so it could never be exported, and
therefore could never be imported by a test either. The parser was a hand-copied
`parseLikeTheAction`, and the script could not detect a change to the shipped code.

That constraint is gone. `readProductFormData` and `parseProductSubmission` now
live in `lib/validation/product-form-data.ts`, which imports nothing from Next.js,
Prisma or Auth.js. `produk/actions.ts` imports `parseProductSubmission` from there
and the copied loops are gone, so the script exercises the production
implementation and a regression in the parser fails it.

The three functions moved verbatim: they were compared character-for-character
against their previous definitions after normalising whitespace and the
`readFormData` → `readProductFormData` rename, and are identical.

One boundary remains, and it is inherent: the action module itself still cannot be
imported without pulling in Prisma and Auth.js. The script therefore asserts by
source inspection that both `createProduct` and `updateProduct` really do route
through `parseProductSubmission`, that the parser is imported rather than re-declared,
and that the module still exports nothing but async functions.

## Deliberate scope limits

- **No database, no Prisma.** `lib/data/*` and every server action are out of
  scope; they open a MySQL connection on import. `media-lifecycle.test.ts` and
  `credentials.test.ts` reach Prisma and Cloudinary only through injected fakes.
- **No Auth.js session tests.** `auth.ts` imports Prisma and reads
  `process.env.AUTH_SECRET` at construction, so the `authorize` callback is not
  exercised end to end; `credentials.test.ts` covers the credential function it
  delegates to instead.
- **No React component tests.** `ProductForm` / `ProductImageUploader` are
  Client Components; testing them needs jsdom or a browser environment. The
  browser harness (`test-row-cap-browser.mts`) covers them for now.
- **No server-action tests.** Importing a server action pulls in Prisma and
  Auth.js. This is what forces `test-row-limit-action.mts` to copy the parser by
  hand — see the limitation noted above.

## One media-URL policy, enforced everywhere

Every admin media field — `Category.imageUrl`, `GalleryImage.imageUrl`,
`ProductImage.imageUrl`, `SiteSettings.heroImageUrl`, `SiteSettings.logoUrl` —
validates through the shared `isAllowedMediaUrl` helper in
`lib/validation/media-url.ts`.

This was not always true. `gallery.ts`, `site-settings.ts` and `product.ts` each
carried their own `value.startsWith('/')` branch, which accepted a
protocol-relative URL such as `//example.com/a.png`. Only `category.ts` had been
migrated. All three now share one helper, and the
`every media validator shares one policy` block in `category.test.ts` asserts
that all five fields return the same verdict for the same input — so a future
edit to one validator cannot silently diverge from the rest.

Before tightening the policy, a read-only audit confirmed no stored row used a
protocol-relative value, so nothing became unsaveable on its next edit.
