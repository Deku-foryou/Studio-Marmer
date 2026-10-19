import { z } from 'zod';

import { MAX_SEARCH_QUERY_LENGTH } from '@/lib/product-suggestions';

/**
 * Query-string validation for the autocomplete endpoint.
 *
 * The `?q=` value arrives from the URL bar, so it is as untrusted as any form
 * field: it is length-capped here and again in the data access layer, and the
 * term is only ever passed to Prisma as a bound `contains` value - never string
 * concatenated into a query.
 *
 * A missing parameter arrives as `''` and fails `min(1)`, so "absent" and
 * "blank" are the same 400 rather than two different code paths.
 */
export const suggestionQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, 'Parameter q tidak boleh kosong.')
    .max(
      MAX_SEARCH_QUERY_LENGTH,
      `Maksimal ${MAX_SEARCH_QUERY_LENGTH} karakter.`
    ),
});

export type SuggestionQuery = z.infer<typeof suggestionQuerySchema>;