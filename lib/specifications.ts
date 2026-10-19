import type { ProductSpecification } from '@/types/product';

/**
 * The `Product.specifications` contract, in ONE place.
 *
 * This module exists because the column is loosely typed JSON and the two
 * readers of it disagreed: the storefront accepted a `value` that was a string
 * OR a number, while the admin loader accepted only strings. A row such as
 * `{"label":"Berat","value":350}` therefore rendered on the product page but was
 * absent from the edit form — and `updateProduct` rewrites the whole column
 * from the form rows, so saving a product for any unrelated reason destroyed
 * every numeric row. Silent, irreversible, and caused purely by two copies of
 * the same parser.
 *
 * Both layers now call `normalizeSpecifications`, so they cannot drift again.
 * The rule is deliberately exactly as wide as the storefront's was: a `value`
 * that is a string or a finite number is rendered as text. Widening it further
 * would let the admin save something the storefront cannot display, which is
 * the same class of bug in reverse.
 *
 * Rows that cannot be represented at all (no label, no usable value) are not
 * thrown away here — they are returned as `skipped` so the save path can carry
 * them through untouched instead of silently deleting an admin's data.
 */

export interface NormalizedSpecifications {
  /** Rows that can be rendered and edited. Safe to hand to a form. */
  rows: ProductSpecification[];
  /** Original entries that no reader could represent. Never modified. */
  skipped: unknown[];
}

/** Non-empty label + string/number value is all that can be rendered. */
function toRow(record: Record<string, unknown>): ProductSpecification | null {
  const label = typeof record.label === 'string' ? record.label.trim() : '';
  if (label.length === 0) return null;

  const raw = record.value;

  // `String(value)` on a non-finite number would yield "NaN"/"Infinity", which
  // is not something an admin typed, so those are rejected outright.
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? { label, value: String(raw) } : null;
  }

  if (typeof raw === 'string' && raw.trim().length > 0) {
    return { label, value: raw.trim() };
  }

  return null;
}

/**
 * Normalizes the `specifications` JSON column.
 *
 * Anything that is not an array yields no rows — the column is optional and may
 * legitimately be NULL for a product with no specifications.
 */
export function normalizeSpecifications(
  value: unknown
): NormalizedSpecifications {
  if (!Array.isArray(value)) return { rows: [], skipped: [] };

  const rows: ProductSpecification[] = [];
  const skipped: unknown[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      skipped.push(entry);
      continue;
    }

    const row = toRow(entry as Record<string, unknown>);

    if (row) rows.push(row);
    else skipped.push(entry);
  }

  return { rows, skipped };
}

/**
 * Re-attaches rows the form could not show to the cleaned rows about to be
 * written back.
 *
 * This is what stops a routine save from deleting data. Anything unrepresentable
 * is preserved verbatim and appended, so the column is never shrunk by an edit
 * that did not target it. Returns `undefined` when there is nothing to store,
 * matching `specificationsToJson`.
 */
export function mergeSkippedSpecifications(
  cleaned: ProductSpecification[] | undefined,
  skipped: readonly unknown[]
): { label: string; value: string }[] | undefined {
  if (skipped.length === 0) return cleaned;

  // Only entries that still look like rows are carried back; a primitive that
  // happened to be in the column is not resurrected into a half-row.
  const preserved: ProductSpecification[] = [];
  for (const entry of skipped) {
    if (entry && typeof entry === 'object') {
      preserved.push(entry as ProductSpecification);
    }
  }

  const merged = [...(cleaned ?? []), ...preserved];
  return merged.length > 0 ? merged : undefined;
}