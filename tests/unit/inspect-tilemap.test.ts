import { describe, expect, it } from 'vitest';
import { mapBase, tileIndexFor, viewport, windowOrigin } from '../../src/core/inspect/tilemap.ts';

describe('tile maps (Pan Docs "LCDC", "Tile Maps", "Scrolling")', () => {
  it('selects the maps by LCDC bits 3 and 6', () => {
    expect(mapBase(0x00, 'background')).toBe(0x9800);
    expect(mapBase(0x08, 'background')).toBe(0x9c00);
    expect(mapBase(0x00, 'window')).toBe(0x9800);
    expect(mapBase(0x40, 'window')).toBe(0x9c00);
  });

  it('addresses tiles with the $8000 method when LCDC bit 4 is set', () => {
    expect(tileIndexFor(0, 0x10)).toBe(0);
    expect(tileIndexFor(255, 0x10)).toBe(255);
  });

  it('addresses tiles with the $8800 method when LCDC bit 4 is clear', () => {
    expect(tileIndexFor(0, 0x00)).toBe(256);
    expect(tileIndexFor(127, 0x00)).toBe(383);
    expect(tileIndexFor(128, 0x00)).toBe(128);
    expect(tileIndexFor(255, 0x00)).toBe(255);
  });

  it('wraps the visible area around the 256 × 256 map', () => {
    const rects = viewport(100, 200);
    expect(rects).toEqual([
      { x: 100, y: 200, width: 156, height: 56 },
      { x: 0, y: 200, width: 4, height: 56 },
      { x: 100, y: 0, width: 156, height: 88 },
      { x: 0, y: 0, width: 4, height: 88 },
    ]);
    expect(rects.reduce((sum, r) => sum + r.width * r.height, 0)).toBe(160 * 144);
    expect(viewport(0, 0)).toEqual([{ x: 0, y: 0, width: 160, height: 144 }]);
  });

  it('places the window at (WX − 7, WY)', () => {
    expect(windowOrigin(87, 40)).toEqual({ x: 80, y: 40 });
  });
});
