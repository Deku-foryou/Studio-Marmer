'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useToast } from './ToastProvider';
import {
  ADMIN_TOASTS,
  TOAST_QUERY_PARAM,
  isAdminToastCode,
  stripFlashHref,
} from '@/lib/admin/toast';

/**
 * Delivers the notification a server action left behind in the URL.
 *
 * WHY THIS EXISTS
 * `redirect()` inside a Server Action throws, so the action never returns a
 * state object and `useActionState` has nothing to hand the form — the outcome
 * of `createProduct` or `deleteProduct` cannot travel through the action's return
 * value at all. Something has to carry it across the navigation, and the URL is
 * the transport that survives every kind of one: a soft client transition and a
 * full document load alike.
 *
 * WHY IT LIVES IN THE LAYOUT
 * A redirect's destination is only known at runtime — `/admin/produk` for a
 * delete, `/admin/produk/{id}/edit` for a create, `/admin/kategori` for a
 * category save. Handling each one on its own page would mean editing every
 * future screen that might be a redirect target, and forgetting one produces a
 * silent failure rather than a visible bug. Mounted once in the dashboard layout,
 * this covers every destination at once, including pages that do not exist yet.
 *
 * Server Component layouts cannot read `searchParams` — they do not re-render on
 * navigation, so the value would go stale. A Client Component inside the layout
 * can, because Client Components re-render on navigation. Hence the hook here
 * rather than a prop on the layout.
 *
 * THE PARAM IS SCRUBBED IMMEDIATELY
 * After showing the toast, the key is removed with `router.replace` (replace, not
 * push, so it does not add a history entry). Left in place, the param would sit
 * in the URL and the message would reappear on a back navigation — the exact
 * stale-state bug the Next.js docs warn about for one-shot messages. The ref
 * covers the remaining case: a re-render that happens between the notify and the
 * navigation completing.
 *
 * An unknown key is dropped silently and still scrubbed. The value is whatever
 * someone typed into the address bar, so it is the boundary where untrusted text
 * must not become UI content — `isAdminToastCode` resolves it against the
 * catalogue first.
 */
export default function ToastFlashListener() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { notify } = useToast();

  const code = searchParams.get(TOAST_QUERY_PARAM);

  // Key already handled, so a re-render before the navigation settles does not
  // raise a second toast for the same redirect.
  const handledCode = useRef<string | null>(null);

  useEffect(() => {
    if (!code) return;

    const query = searchParams.toString();

    const scrub = () => {
      const next = stripFlashHref(pathname, query);
      router.replace(next, { scroll: false });
    };

    if (!isAdminToastCode(code)) {
      // Not one of ours. Remove it anyway so a mistyped or stale value cannot
      // sit in the URL indefinitely.
      scrub();
      return;
    }

    if (handledCode.current !== code) {
      handledCode.current = code;
      notify(ADMIN_TOASTS[code]);
    }

    scrub();
  }, [code, pathname, router, notify, searchParams]);

  return null;
}
