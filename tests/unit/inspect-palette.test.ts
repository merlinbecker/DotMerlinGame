import { describe, expect, it } from 'vitest';
import { applyPalette } from '../../src/core/inspect/palette.ts';

describe('applyPalette (Pan Docs "Palettes")', () => {
  it.each([
    [0xe4, [0, 1, 2, 3]],
    [0x1b, [3, 2, 1, 0]],
    [0x00, [0, 0, 0, 0]],
    [0xd2, [2, 0, 1, 3]],
  ] as const)('maps the color indices through %i', (palette, expected) => {
    expect([0, 1, 2, 3].map((index) => applyPalette(index as 0 | 1 | 2 | 3, palette))).toEqual(expected);
  });
});
