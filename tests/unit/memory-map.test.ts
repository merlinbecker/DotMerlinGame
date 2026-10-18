import { describe, expect, it } from 'vitest';
import { MEMORY_MAP } from '../../src/core/rom/memory-map.ts';

describe('DMG memory map (Pan Docs "Memory Map", FR-025)', () => {
  it('covers $0000-$FFFF without gaps or overlaps', () => {
    let next = 0;
    for (const region of MEMORY_MAP) {
      expect(region.start).toBe(next);
      expect(region.end).toBeGreaterThanOrEqual(region.start);
      next = region.end + 1;
    }
    expect(next).toBe(0x10000);
  });

  it('has the Pan Docs regions with their kinds', () => {
    expect(MEMORY_MAP.map((r) => [r.start, r.end, r.kind])).toEqual([
      [0x0000, 0x3fff, 'rom-fixed'],
      [0x4000, 0x7fff, 'rom-banked'],
      [0x8000, 0x9fff, 'vram'],
      [0xa000, 0xbfff, 'cart-ram'],
      [0xc000, 0xdfff, 'wram'],
      [0xe000, 0xfdff, 'echo'],
      [0xfe00, 0xfe9f, 'oam'],
      [0xfea0, 0xfeff, 'unusable'],
      [0xff00, 0xff7f, 'io'],
      [0xff80, 0xfffe, 'hram'],
      [0xffff, 0xffff, 'ie'],
    ]);
  });

  it('names every region', () => {
    for (const region of MEMORY_MAP) expect(region.name.length).toBeGreaterThan(0);
  });
});
