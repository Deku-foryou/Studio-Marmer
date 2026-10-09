'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Counts completed form submissions, so inputs can be keyed on it.
 *
 * WHY THIS EXISTS
 * React 19 resets every form control to its `defaultValue` once a Server Action
 * finishes — the DOM reset happens before the action is even invoked
 * (`requestFormReset` → `form.reset()`). Every admin form here used to drive its
 * fields from `defaultValue` alone, so a *failed* save wiped the admin's typing and
 * silently restored the values the server-rendered page was built with.
 *
 * Making the fields controlled fixes the visible value, because React writes the
 * controlled `value` back into the DOM. It is not enough on its own for the control
 * types whose reset value React does not keep in sync: `<select>` only refreshes
 * `defaultSelected` when it is first mounted, and a `<input type="checkbox">` is
 * re-checked from `checked` without updating `defaultChecked`. Those controls are
 * therefore remounted by keying them on this counter, which re-seeds their reset
 * state from the current React state.
 *
 * The counter advances only when the action result changes identity, so it does not
 * move while the admin is typing — remounting mid-keystroke would drop focus.
 */
export function useFieldEpoch(state: unknown, initialState: unknown): number {
  const [epoch, setEpoch] = useState(0);

  // Seeded with the initial state so the first render is epoch 0 and no field is
  // remounted on mount.
  const lastSeen = useRef(initialState);

  useEffect(() => {
    if (lastSeen.current === state) return;

    lastSeen.current = state;
    setEpoch((current) => current + 1);
  }, [state]);

  return epoch;
}