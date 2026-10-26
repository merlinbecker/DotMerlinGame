import { describe, expect, it } from 'vitest';
import { alignTop, bytesPerRow, ROW_CHARS } from '../../src/core/inspect/hex-layout.ts';

describe('hex row width (FR-005, Clarification Q3)', () => {
  it('shows 16 bytes when a full 16-byte row fits, otherwise 8', () => {
    expect(bytesPerRow(ROW_CHARS[16] * 8, 8)).toBe(16);
    expect(bytesPerRow(ROW_CHARS[16] * 8 - 1, 8)).toBe(8);
    expect(bytesPerRow(100, 8)).toBe(8);
  });

  it('starts every row at a multiple of the row width from the area start', () => {
    expect(alignTop(0xc085, 0xc000, 16)).toBe(0xc080);
    expect(alignTop(0xc085, 0xc000, 8)).toBe(0xc080);
    expect(alignTop(0xff88, 0xff80, 16)).toBe(0xff80);
  });

  it('keeps the top address on the page when switching 16 → 8 → 16', () => {
    const top16 = alignTop(0xc0a7, 0xc000, 16);
    const top8 = alignTop(top16, 0xc000, 8);
    expect(top8).toBe(top16);
    expect(alignTop(0xc0a8, 0xc000, 16)).toBeLessThanOrEqual(0xc0a8);
    expect(alignTop(0xc0a8, 0xc000, 16) + 16).toBeGreaterThan(0xc0a8);
  });
});
