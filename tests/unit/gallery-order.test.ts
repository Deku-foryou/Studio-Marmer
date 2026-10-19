import { describe, it, expect } from 'vitest';

import { applyGalleryMove } from '@/lib/data/admin/gallery';

/**
 * Regression: reordering the gallery scrambled the whole list.
 *
 * `sortOrder` is a display position and is not unique — new photos used to be
 * created with `sortOrder: 0`, so a fresh gallery had three or more rows
 * sharing a value. The move logic handled that case by nudging the neighbour's
 * value by ±1, and its comment claimed no third row could be affected. It could:
 * with ids 1, 2, 3 all at 0, moving the second photo up produced the rendered
 * order 2, 3, 1 — the photo nobody touched jumped ahead of the one that moved.
 *
 * The tests model what the database actually stores and what the storefront
 * actually reads: rows are written with `sortOrder = position`, then read back
 * with `sortOrder asc, id asc`.
 */

interface Row {
  id: number;
  sortOrder: number;
}

/** Applies a move, writes `sortOrder = position`, then reads the storefront order. */
function renderedAfterMove(
  ids: readonly number[],
  id: number,
  direction: -1 | 1
): number[] | 'edge' | 'not-found' {
  const result = applyGalleryMove(ids, id, direction);
  if (result.status !== 'moved') return result.status;

  const rows: Row[] = result.orderedIds.map((rowId, position) => ({
    id: rowId,
    sortOrder: position,
  }));

  rows.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  return rows.map((row) => row.id);
}

describe('applyGalleryMove', () => {
  it('moves the second photo up past the first, leaving the third alone', () => {
    // The exact regression: three photos that all shared sortOrder 0.
    expect(renderedAfterMove([1, 2, 3], 2, -1)).toEqual([2, 1, 3]);
  });

  it('moves the second photo down past the third', () => {
    expect(renderedAfterMove([1, 2, 3], 2, 1)).toEqual([1, 3, 2]);
  });

  it('moves the third photo up past the second', () => {
    expect(renderedAfterMove([1, 2, 3], 3, -1)).toEqual([1, 3, 2]);
  });

  it('never reorders a photo the move did not target', () => {
    const result = applyGalleryMove([1, 2, 3, 4, 5], 3, -1);
    expect(result).toEqual({ status: 'moved', orderedIds: [1, 3, 2, 4, 5] });
  });

  it('returns the full new sequence so every row can be renumbered', () => {
    const result = applyGalleryMove([10, 20, 30], 20, 1);
    expect(result).toEqual({ status: 'moved', orderedIds: [10, 30, 20] });
  });

  describe('edges', () => {
    it('reports the top photo moving up as an edge, changing nothing', () => {
      expect(applyGalleryMove([1, 2, 3], 1, -1)).toEqual({ status: 'edge' });
    });

    it('reports the bottom photo moving down as an edge, changing nothing', () => {
      expect(applyGalleryMove([1, 2, 3], 3, 1)).toEqual({ status: 'edge' });
    });

    it('reports an edge for a single photo in both directions', () => {
      expect(applyGalleryMove([1], 1, -1)).toEqual({ status: 'edge' });
      expect(applyGalleryMove([1], 1, 1)).toEqual({ status: 'edge' });
    });

    it('reports an unknown id as not-found', () => {
      expect(applyGalleryMove([1, 2, 3], 99, -1)).toEqual({
        status: 'not-found',
      });
      expect(applyGalleryMove([], 99, -1)).toEqual({ status: 'not-found' });
    });
  });

  it('leaves the input array untouched', () => {
    const ids = [1, 2, 3];
    applyGalleryMove(ids, 1, 1);
    expect(ids).toEqual([1, 2, 3]);
  });

  it('produces a sequence with no duplicate positions', () => {
    const result = applyGalleryMove([1, 2, 3, 4], 2, -1);
    expect(result.status).toBe('moved');
    if (result.status !== 'moved') return;

    const positions = result.orderedIds.map((_, index) => index);
    expect(new Set(positions).size).toBe(result.orderedIds.length);
  });

  it('round-trips: moving up then down restores the original order', () => {
    const up = applyGalleryMove([1, 2, 3], 3, -1);
    expect(up.status).toBe('moved');
    if (up.status !== 'moved') return;

    expect(applyGalleryMove(up.orderedIds, 3, 1)).toEqual({
      status: 'moved',
      orderedIds: [1, 2, 3],
    });
  });

  it('handles a longer sequence one position at a time', () => {
    // Bubble the last photo to the front; every step must stay a valid order.
    let ids = [1, 2, 3, 4, 5];
    for (let i = 0; i < 4; i++) {
      const result = applyGalleryMove(ids, 5, -1);
      expect(result.status).toBe('moved');
      if (result.status !== 'moved') return;
      ids = result.orderedIds;
    }
    expect(ids).toEqual([5, 1, 2, 3, 4]);
  });
});