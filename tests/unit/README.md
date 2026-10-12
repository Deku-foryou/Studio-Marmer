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

| File | Covers |
| --- | --- |
| `product.test.ts` | `createProductSchema`, `updateProductSchema`, required fields, numeric coercion, row limits, `specificationsToJson` |
| `category.test.ts` | Category create/update, gallery and site-media URL policy, the URL/`publicId` column resolvers |
| `media-url.test.ts` | `isAllowedMediaUrl`, `hasUnsafeUrlCharacters` |
| `product-rows.test.ts` | `findRowOverflow`, `overflowFieldErrors`, `MAX_PRODUCT_ROWS` |
| `crypto-and-roles.test.ts` | `hashPassword` / `verifyPassword`, `isAdminRole` |

## What does NOT belong here, and where it lives instead

These are real tests, but they need infrastructure this suite deliberately does
not have. **None of them are run by `npm test`.**

| Script | Needs | Status |
| --- | --- | --- |
| `test-validation.mts` | nothing | Superseded by the suite above; still runnable via `npm run test:scripts` |
| `test-row-overflow.mts` | nothing | Same — kept as an independent cross-check of the row-limit rule |
| `test-row-limit-action.mts` | nothing, but see below | Temporary harness |
| `test-row-cap-browser.mts` | running dev server + real Chrome + signed-in admin | Integration |
| `verify-e2e.mts` | running server + MySQL | Integration |
| `verify-form-reset.mts` | running server | Integration |
| `verify-form-source.mts` | none | Static source check |

### Known limitation of `test-row-limit-action.mts`

It **re-declares** the `readFormData` row loops rather than importing them,
because `readFormData` is not exported from `produk/actions.ts` and importing that
module would pull in Prisma and Auth.js.

The consequence is real and worth stating plainly: **it cannot detect a change to
the actual parser.** If someone edits the loops in `produk/actions.ts`, this
script keeps passing. It validates the *shape of the algorithm*, not the shipped
code.

`findRowOverflow` itself is covered properly in `product-rows.test.ts` against the
real implementation. Closing this gap properly means extracting the row-reading
logic out of `produk/actions.ts` into an importable, side-effect-free module so it
can be tested directly — a refactor for a later phase, not something to fake here.

## Deliberate scope limits

- **No database, no Prisma.** `lib/data/*` and every server action are out of
  scope; they open a MySQL connection on import.
- **No Auth.js session tests.** `auth.ts` imports Prisma and reads
  `process.env.AUTH_SECRET` at construction.
- **No rate-limiter tests.** `lib/auth/rate-limiter.ts` holds module-level
  mutable state in a `Map` keyed by IP, with a 15-minute window and a
  `setInterval`. That is testable in isolation, but only with fake timers or by
  resetting exported state — neither of which exists today. It needs a design
  decision first, not a test bolted on afterwards.
- **No React component tests.** `ProductForm` / `ProductImageUploader` are
  Client Components; testing them needs jsdom or a browser environment. The
  browser harness (`test-row-cap-browser.mts`) covers them for now.

## A known divergence, asserted on purpose

`gallery.ts` and `site-settings.ts` have **not** been migrated to the shared
`isAllowedMediaUrl` helper. They still use `value.startsWith('/')`, which accepts
a protocol-relative URL such as `//example.com/a.png`.

`category.test.ts` asserts that current behaviour explicitly and labels it as a
gap. Those specific expectations are expected to flip to `false` once both files
adopt the shared helper — at which point the
`URL policy divergence between validators` block can be deleted.

This is recorded rather than fixed here because changing which URLs the admin
form accepts is an application behaviour change, not a testing change.
