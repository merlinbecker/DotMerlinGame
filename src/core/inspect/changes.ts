/**
 * Offsets whose value differs from what the view showed last time (FR-011). Empty when there is nothing to
 * compare with, e.g. the first picture or a different page.
 */
export function diffBytes(previous: Uint8Array | null, next: Uint8Array): Set<number> {
  const changed = new Set<number>();
  if (!previous || previous.length !== next.length) return changed;
  for (let i = 0; i < next.length; i++) if (previous[i] !== next[i]) changed.add(i);
  return changed;
}
