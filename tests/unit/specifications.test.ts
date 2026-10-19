import { describe, it, expect } from 'vitest';

import { readSpecifications } from '@/lib/data/admin/products';
import { specificationsToJson } from '@/lib/validation/product';
import { normalizeSpecifications } from '@/lib/specifications';

/**
 * Regression: numeric specification rows used to be destroyed by a routine save.
 *
 * `Product.specifications` is a loosely-typed JSON column. The storefront
 * renderer accepted a `value` that was a string OR a number; the admin loader
 * accepted only strings. So `{"label":"Berat","value":350}` rendered on the
 * product page but was absent from the edit form — and `updateProduct` writes
 * the entire column back from the form rows, so opening a product to change one
 * field and pressing Save destroyed every numeric row. Silent and irreversible.
 *
 * The test drives the real round trip: stored JSON -> admin form rows ->
 * `specificationsToJson` -> what would be written back.
 */
describe('specification rows survive a load → save round trip', () => {
  const stored = [
    { label: 'Model', value: 'CUBIS' },
    { label: 'Berat', value: 350 },
  ];

  it('keeps a numeric value intact through the admin edit form', () => {
    expect(readSpecifications(stored)).toEqual([
      { label: 'Model', value: 'CUBIS' },
      { label: 'Berat', value: '350' },
    ]);
  });

  it('does not drop the row when the form is written back to the column', () => {
    const written = specificationsToJson(readSpecifications(stored));

    expect(written).toEqual([
      { label: 'Model', value: 'CUBIS' },
      { label: 'Berat', value: '350' },
    ]);
  });

  it('produces the same rows the storefront would render', () => {
    // The two layers must never disagree again: whatever the admin form can
    // save has to be exactly what the customer sees.
    const fromAdmin = readSpecifications(stored);
    const fromStorefront = normalizeSpecifications(stored).rows;

    expect(fromAdmin).toEqual(fromStorefront);
  });

  it('is stable across a second round trip', () => {
    const once = specificationsToJson(readSpecifications(stored));
    const twice = specificationsToJson(readSpecifications(once));

    expect(twice).toEqual(once);
  });

  it('still coerces other primitive shapes the storefront already showed', () => {
    // The storefront only ever displayed string|number. Anything wider would be
    // a new divergence, so these stay excluded rather than "helpfully" widened.
    expect(readSpecifications([{ label: 'A', value: 0 }])).toEqual([
      { label: 'A', value: '0' },
    ]);
    expect(readSpecifications([{ label: 'A', value: -12.5 }])).toEqual([
      { label: 'A', value: '-12.5' },
    ]);
  });

  it('drops rows that are not renderable at all, in BOTH layers', () => {
    const mixed = [
      { label: 'Baik', value: 'ok' },
      { label: 'Tanpa nilai' },
      { label: '', value: 'tanpa label' },
      { value: 'tanpa label sama sekali' },
      null,
      'bukan objek',
    ];

    expect(readSpecifications(mixed)).toEqual([{ label: 'Baik', value: 'ok' }]);
    expect(normalizeSpecifications(mixed).rows).toEqual([
      { label: 'Baik', value: 'ok' },
    ]);
  });

  it('handles a non-array column without throwing', () => {
    expect(readSpecifications(null)).toEqual([]);
    expect(readSpecifications({ label: 'x', value: 'y' })).toEqual([]);
    expect(normalizeSpecifications('bukan array').rows).toEqual([]);
  });

  it('reports how many rows were unrepresentable, so a save can refuse to drop them', () => {
    const result = normalizeSpecifications([
      { label: 'Baik', value: 'ok' },
      { label: 'Rusak' },
    ]);

    expect(result.rows).toEqual([{ label: 'Baik', value: 'ok' }]);
    expect(result.skipped).toHaveLength(1);
  });

  it('exposes the skipped rows so they can be carried through a save', () => {
    const result = normalizeSpecifications([
      { label: 'Baik', value: 'ok' },
      { label: 'Rusak' },
    ]);

    // Preserved verbatim: the save path re-appends these instead of destroying
    // whatever the form could not show.
    expect(result.skipped[0]).toEqual({ label: 'Rusak' });
  });
});