/**
 * Deterministic slug generation for product URLs.
 *
 * Rules:
 *  - lowercase
 *  - accents stripped (marmer names are typed in Indonesian/English, but a name
 *    pasted with diacritics should still produce a clean slug)
 *  - URL safe: only `a-z`, `0-9` and single hyphens
 *  - bounded length so the column limit (VarChar 220) is never at risk
 *
 * Uniqueness is resolved separately by the DAL using a deterministic numeric
 * suffix (`-2`, `-3`, ...). No random component is ever used in a public slug,
 * so the same name always produces the same base slug.
 */

/** Indonesian/European characters that need transliterating before stripping. */
const TRANSLITERATIONS: Record<string, string> = {
  ñ: 'n',
  Ñ: 'n',
  ø: 'o',
  Ø: 'o',
  æ: 'ae',
  Æ: 'ae',
  ß: 'ss',
  đ: 'd',
  Đ: 'd',
  ð: 'd',
  þ: 'th',
  Þ: 'th',
  œ: 'oe',
  Œ: 'oe',
};

/** Keeps the slug comfortably inside VarChar(220) once suffixes are added. */
const MAX_SLUG_LENGTH = 180;

/**
 * Converts arbitrary text into a URL-safe slug base.
 * Returns an empty string when nothing usable remains.
 */
export function slugify(input: string): string {
  let value = input.trim().toLowerCase();

  for (const [from, to] of Object.entries(TRANSLITERATIONS)) {
    value = value.split(from).join(to);
  }

  return value
    .normalize('NFD')
    // Strip combining diacritical marks left behind by NFD.
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
}
