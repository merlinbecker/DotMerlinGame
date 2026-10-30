import type { JsonValue } from '../../core/index.ts';

/** The saved page of a view state; anything invalid gives the first page. */
export function parsePage(json: JsonValue): number {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return 0;
  const page = (json as { readonly [key: string]: JsonValue }).page;
  return typeof page === 'number' && Number.isInteger(page) && page >= 0 ? page : 0;
}
