import { describe, expect, it } from 'vitest';
import { diffBytes } from '../../src/core/inspect/changes.ts';

describe('diffBytes (FR-011)', () => {
  it('returns the offsets whose value changed', () => {
    expect([...diffBytes(Uint8Array.of(1, 2, 3, 4), Uint8Array.of(1, 9, 3, 0))]).toEqual([1, 3]);
  });

  it('marks nothing without a previous view or when the shown range changed size', () => {
    expect(diffBytes(null, Uint8Array.of(1, 2)).size).toBe(0);
    expect(diffBytes(Uint8Array.of(1), Uint8Array.of(1, 2)).size).toBe(0);
  });
});
