import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Vitest configuration.
 *
 * SCOPE — WHAT IS AND IS NOT A UNIT TEST HERE
 * `include` deliberately covers ONLY `tests/unit/**`. The repository also has
 * `test-*.mts` and `verify-*.mts` scripts at the root, and those are a different
 * kind of thing:
 *
 *   - `test-validation.mts`, `test-row-overflow.mts` — pure schema/helper checks
 *     that now live properly in `tests/unit/`. The originals are kept running by
 *     `npm run test:scripts` so no coverage is lost.
 *   - `test-row-limit-action.mts` — replays the FormData row loops. Useful, but
 *     it re-declares the parser rather than importing it, so it cannot catch a
 *     change to the real code. See tests/unit/README.md.
 *   - `test-row-cap-browser.mts` — needs a running dev server, a real Chrome and
 *     a signed-in admin. An integration test, deliberately excluded here.
 *   - `verify-e2e.mts`, `verify-form-reset.mts`, `verify-form-source.mts` — the
 *     pre-existing manual harnesses, untouched by this phase.
 *
 * ENVIRONMENT
 * `environment: 'node'` and no setup file: every module under test
 * (`lib/validation/*`) imports only `zod` and a pure helper. No MySQL, no
 * Cloudinary, no `AUTH_SECRET`, no `.env`. A test that needs any of those
 * belongs in an integration suite, not here.
 *
 * The `@/` alias mirrors tsconfig.json so modules can be imported the same way
 * the application imports them; Vitest does not read tsconfig paths on its own.
 *
 * Named `.mts` because the package is CommonJS (`package.json` has no
 * `"type": "module"`), and a `.ts` config would be loaded as CJS and warn about
 * its ESM syntax. `.mts` is the same convention the existing root-level
 * `test-*.mts` / `verify-*.mts` scripts already use.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    // No globals: every test imports `describe`/`it`/`expect` explicitly, so a
    // missing import is a type error rather than a silently undefined function.
    globals: false,
    // Deterministic, repeatable runs: no shuffling, and a fixed reporter.
    sequence: { shuffle: false },
    reporters: ['default'],
  },
});
