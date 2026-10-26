import { useRef } from 'react';
import { diffBytes } from '../../core/inspect/changes.ts';

/**
 * Offsets that changed since the view last showed the same range (FR-011, research.md R8). Compares only
 * when a new snapshot arrives; re-renders for other reasons keep the marks.
 */
export function useChanges(snapshotFrame: number | null, rangeKey: string, bytes: Uint8Array | null): ReadonlySet<number> {
  const last = useRef<{ frame: number | null; key: string; bytes: Uint8Array | null; changed: ReadonlySet<number> }>({ frame: null, key: '', bytes: null, changed: new Set() });
  const current = last.current;
  if (current.frame !== snapshotFrame || current.key !== rangeKey) {
    const changed = current.key === rangeKey && bytes ? diffBytes(current.bytes, bytes) : new Set<number>();
    last.current = { frame: snapshotFrame, key: rangeKey, bytes: bytes && bytes.slice(), changed };
  }
  return last.current.changed;
}
