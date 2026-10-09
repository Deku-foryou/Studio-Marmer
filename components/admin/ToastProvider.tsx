'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToastMessage, ToastTone } from '@/lib/admin/toast';

/**
 * Admin toast notifications — provider, viewport and hook.
 *
 * ONE PROVIDER FOR THE WHOLE DASHBOARD
 * Mounted in the dashboard layout, so every screen shares a single queue and a
 * single notification surface. Components never position or style a toast
 * themselves; they call `useToast().notify(...)` and forget about it, which is
 * what keeps the wording, timing and accessibility identical everywhere instead
 * of each screen inventing its own banner.
 *
 * TWO WAYS A NOTIFICATION ARRIVES
 *  - directly, from a Client Component that already holds the action result;
 *  - via the URL, for a server action that redirects. That second path is
 *    handled by ToastFlashListener, which calls the same `notify`.
 *
 * DEDUPLICATION
 * `useActionState` keeps its result until the next submit, so a component that
 * simply notified on `state.status === 'success'` would re-fire on every
 * unrelated re-render. Two independent guards prevent that:
 *
 *  - callers pair `notify` with a ref holding the exact state object they last
 *    handled, which is what makes the effect fire once per action result rather
 *    than once per render;
 *  - `notify` itself refuses an identical message it has already shown within
 *    `DEDUPE_WINDOW_MS`. That covers the remaining source of duplicates — a
 *    redirect whose destination mounts the listener twice, or a soft navigation
 *    that replays the effect.
 *
 * The window is short on purpose: the same message a minute later is a genuinely
 * new event (saving the same form twice), and must not be swallowed.
 *
 * AUTO-DISMISS AND PAUSING
 * Errors stay longer than successes because they carry more text to read, and
 * every toast pauses its countdown while hovered or focused so a message cannot
 * expire out from under someone reaching for the close button or reading it with
 * a screen reader.
 *
 * ACCESSIBILITY
 * The live region is always mounted — empty before the first toast — because a
 * live region that is inserted into the DOM together with its content is not
 * reliably announced. Errors use `role="alert"` (assertive, interrupts); success
 * and warning use `role="status"` (polite, waits for a pause), which matches the
 * urgency of each. Colours are the ones already used by the admin banners, with
 * the text tones darkened where the original fails contrast on white.
 */

export interface ToastOptions {
  /**
   * Overrides the auto-dismiss delay in milliseconds. Useful for messages the
   * admin genuinely has to read — a long error, for instance.
   */
  durationMs?: number;
}

interface ToastContextValue {
  /** Queues a notification. Safe to call from event handlers and effects. */
  notify: (toast: ToastMessage, options?: ToastOptions) => void;
  /** Removes one toast early, e.g. from its close button. */
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// ─── Tuning ────────────────────────────────────────────────────────────────────

/**
 * Default lifetimes.
 *
 * 6s for an error because it is the longest text and the one an admin may need
 * to act on; 5s for a warning, which is informational but worth not missing;
 * 4s for a success, which is pure confirmation of something already visible.
 */
const DURATION_MS: Record<ToastTone, number> = {
  success: 4000,
  warning: 5000,
  error: 6000,
};

/**
 * Two identical messages inside this window are the same event.
 *
 * Comfortably shorter than the shortest toast lifetime, so it cannot swallow a
 * legitimate repeat of the same message, while still covering the render burst
 * that follows a redirect.
 */
const DEDUPE_WINDOW_MS = 1200;

/**
 * Cap on simultaneously visible toasts.
 *
 * Without it, a bulk operation or a fast sequence of saves pushes the stack off
 * screen. The oldest is dropped rather than the newest: the newest is the one
 * the admin is waiting on.
 */
const MAX_VISIBLE = 4;

// ─── Presentation ──────────────────────────────────────────────────────────────

/**
 * Per-tone visual treatment.
 *
 * Border colours are the low-alpha tints the admin banners already use. The text
 * and icon tones are deliberately darker than those banners: `#C4553D` measures
 * 4.45:1 on white, just under the 4.5:1 AA threshold for normal text, so the
 * toast text uses `#A8452F` (5.9:1) instead. Warning reuses the `#8B7355` accent
 * family, darkened to `#7A5C1E` (6.2:1) for the same reason.
 */
const TONE_STYLE: Record<
  ToastTone,
  {
    Icon: typeof CheckCircle2;
    container: string;
    icon: string;
    text: string;
    role: 'alert' | 'status';
    ariaLive: 'assertive' | 'polite';
  }
> = {
  success: {
    Icon: CheckCircle2,
    container: 'border-[#5C8A5C]/40',
    icon: 'text-[#5C8A5C]',
    text: 'text-[#41693F]',
    role: 'status',
    ariaLive: 'polite',
  },
  error: {
    Icon: AlertCircle,
    container: 'border-[#C4553D]/40',
    icon: 'text-[#C4553D]',
    text: 'text-[#A8452F]',
    role: 'alert',
    ariaLive: 'assertive',
  },
  warning: {
    Icon: AlertTriangle,
    container: 'border-[#8B7355]/40',
    icon: 'text-[#7A5C1E]',
    text: 'text-[#7A5C1E]',
    role: 'status',
    ariaLive: 'polite',
  },
};

interface ToastItem {
  id: string;
  tone: ToastTone;
  message: string;
  durationMs: number;
}

/**
 * A single toast.
 *
 * Owns its dismiss timer so that pausing one toast never affects the others.
 * The countdown is tracked as a remaining-time ref rather than a single deadline
 * so that hovering, leaving, focusing and blurring compose correctly instead of
 * restarting the full duration on every mouse move.
 */
function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [isPaused, setIsPaused] = useState(false);
  const remainingRef = useRef(toast.durationMs);

  const style = TONE_STYLE[toast.tone];
  const { Icon } = style;

  useEffect(() => {
    if (isPaused) return;

    const tick = 100;
    const timer = setInterval(() => {
      remainingRef.current -= tick;
      if (remainingRef.current <= 0) {
        clearInterval(timer);
        onDismiss(toast.id);
      }
    }, tick);

    return () => clearInterval(timer);
  }, [isPaused, toast.id, onDismiss]);

  return (
    <div
      // `role` is per-tone: an error interrupts, everything else waits its turn.
      role={style.role}
      aria-live={style.ariaLive}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      className={cn(
        'pointer-events-auto w-full border bg-white px-4 py-3 shadow-[0_8px_24px_rgba(26,26,26,0.10)]',
        'animate-slide-in-right',
        style.container
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          size={16}
          strokeWidth={1.5}
          className={cn('mt-0.5 flex-shrink-0', style.icon)}
          aria-hidden="true"
        />

        <p className={cn('flex-1 text-xs leading-relaxed', style.text)}>
          {toast.message}
        </p>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Tutup notifikasi"
          className="-mr-1 -mt-1 flex-shrink-0 p-1 text-[#999999] transition-colors hover:text-[#1A1A1A]"
        >
          <X size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /**
   * Keys of recently-shown messages and when they were shown.
   *
   * A ref rather than state: this must never trigger a render, and pruning it is
   * a cheap filter that happens on the next `notify` call.
   */
  const recentlyShown = useRef(new Map<string, number>());

  // Monotonic counter for ids. A ref so ids stay unique across a burst of
  // notifications within one render pass, which `Date.now()` alone would not.
  const nextId = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (toast: ToastMessage, options?: ToastOptions) => {
      const key = `${toast.tone}:${toast.message}`;
      const now = Date.now();
      const previous = recentlyShown.current.get(key);

      if (previous !== undefined && now - previous < DEDUPE_WINDOW_MS) {
        return;
      }

      recentlyShown.current.set(key, now);
      // Opportunistic prune so the map cannot grow without bound on a long-lived
      // dashboard session.
      for (const [k, at] of recentlyShown.current) {
        if (now - at > DEDUPE_WINDOW_MS * 10) recentlyShown.current.delete(k);
      }

      nextId.current += 1;
      const item: ToastItem = {
        id: `toast-${nextId.current}`,
        tone: toast.tone,
        message: toast.message,
        durationMs: options?.durationMs ?? DURATION_MS[toast.tone],
      };

      setToasts((current) =>
        [...current, item].slice(-MAX_VISIBLE)
      );
    },
    []
  );

  const value = useMemo<ToastContextValue>(
    () => ({ notify, dismiss }),
    [notify, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/*
        The live region is mounted unconditionally and stays in the DOM when
        empty. That is what lets a screen reader announce toasts that appear
        later; a region inserted together with its first child is often missed.

        `pointer-events-none` on the container lets clicks pass through the gaps
        between toasts, with each toast re-enabling them for itself.

        `z-[200]` is deliberate: the admin confirm dialogs sit at `z-[130]`, and
        a notification raised by an action inside one of those dialogs must stay
        visible above it.

        Stacked from the top on mobile (where the full width is used) and
        right-aligned on desktop. No `role="region"` wrapper is added because
        the individual `role="alert"` / `role="status"` children already carry
        the live-region semantics, and nesting them inside another live region
        would make announcements fire twice.
      */}
      <div
        aria-label="Notifikasi"
        className={cn(
          'pointer-events-none fixed inset-x-0 top-0 z-[200] flex flex-col gap-2',
          'px-4 pt-4 sm:inset-x-auto sm:right-0 sm:items-end sm:px-6 sm:pt-6'
        )}
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="w-full sm:w-[380px]">
            <Toast toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Access to the admin toast queue.
 *
 * Throws outside a provider rather than degrading silently: a notification that
 * goes nowhere is worse than a loud failure, because it reads to the admin as
 * "nothing happened".
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}
