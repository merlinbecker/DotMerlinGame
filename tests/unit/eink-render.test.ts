import { describe, expect, it } from 'vitest';
import { BAYER_4X4, renderEink } from '../../src/views/screen/eink.ts';

const LINEAR = [255, 170, 85, 0] as const;
const CONTRAST = [255, 200, 56, 0] as const;

function screenOf(shade: number) {
  return new Uint8Array(160 * 144).fill(shade);
}

describe('e-ink rendering (FR-021)', () => {
  it('keeps the four DMG shades distinguishable with the high-contrast mapping', () => {
    const levels = [0, 1, 2, 3].map((shade) => renderEink(screenOf(shade), { palette: CONTRAST, dither: false })[0]);
    expect(new Set(levels).size).toBe(4);
    expect(levels).toEqual([255, 200, 56, 0]);
  });

  it('maps linearly with the linear palette', () => {
    expect([0, 1, 2, 3].map((shade) => renderEink(screenOf(shade), { palette: LINEAR, dither: false })[0])).toEqual([255, 170, 85, 0]);
  });

  it('dithers to pure black and white with an ordered 4x4 Bayer matrix', () => {
    const out = renderEink(screenOf(1), { palette: LINEAR, dither: true });
    expect([...new Set(out)].sort()).toEqual([0, 255]);
    expect(BAYER_4X4.length).toBe(16);
  });

  it.each([0, 1, 2, 3])('keeps the average brightness of shade %i per 4x4 block', (shade) => {
    const out = renderEink(screenOf(shade), { palette: LINEAR, dither: true });
    let sum = 0;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) sum += out[y * 160 + x] ?? 0;
    expect(Math.abs(sum / 16 - LINEAR[shade as 0 | 1 | 2 | 3])).toBeLessThanOrEqual(255 / 16 + 1);
  });
});
