/**
 * pagination.ts
 *
 * Shared helpers for parsing & applying pagination across endpoints.
 *
 * We standardize on offset pagination (page/limit) rather than
 * cursor pagination because the Origin lists are ordered by
 * created_at desc and inserts are infrequent enough that page
 * stability is not a concern. Cursor pagination can be layered on
 * later for very large feeds (activity log) without breaking
 * existing clients.
 *
 * Hard caps:
 *   - DEFAULT_LIMIT keeps payloads small for the common case.
 *   - MAX_LIMIT prevents a malicious or buggy client from asking
 *     for "everything" and exhausting Postgres memory.
 */

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

export interface PaginationParams {
  page: number;
  limit: number;
  /** Inclusive zero-indexed start of the slice. */
  from: number;
  /** Inclusive zero-indexed end of the slice. */
  to: number;
}

export interface Paginated<T> {
  data: T[];
  total?: number;
  page: number;
  limit: number;
}

export function parsePagination(
  rawPage?: string | number,
  rawLimit?: string | number,
): PaginationParams {
  const pageNum =
    typeof rawPage === 'number'
      ? rawPage
      : rawPage
        ? parseInt(rawPage, 10)
        : NaN;
  const limitNum =
    typeof rawLimit === 'number'
      ? rawLimit
      : rawLimit
        ? parseInt(rawLimit, 10)
        : NaN;

  const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;
  const limit = Number.isFinite(limitNum) && limitNum > 0
    ? Math.min(limitNum, MAX_LIMIT)
    : DEFAULT_LIMIT;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return { page, limit, from, to };
}
