import { describe, expect, it } from 'vitest';
import { decodeObject, OBJECT_COUNT } from '../../src/core/inspect/oam.ts';

function oamWith(entries: readonly (readonly [number, number, number, number])[]): Uint8Array {
  const oam = new Uint8Array(160);
  entries.forEach((entry, i) => {
    oam.set(entry, i * 4);
  });
  return oam;
}

const TALL = 0x04;

describe('OAM entries (Pan Docs "OAM")', () => {
  it('has 40 entries of 4 bytes', () => {
    expect(OBJECT_COUNT).toBe(40);
  });

  it('decodes position, tile and attribute bits', () => {
    const oam = oamWith([[16, 8, 0x21, 0b1111_0000]]);
    expect(decodeObject(oam, 0, 0)).toEqual({ index: 0, y: 16, x: 8, tile: 0x21, tiles: [0x21], priority: true, flipY: true, flipX: true, palette: 1, visible: true });
    expect(decodeObject(oamWith([[16, 8, 0, 0]]), 0, 0)).toMatchObject({ priority: false, flipY: false, flipX: false, palette: 0 });
  });

  it('uses the tile pair NN & $FE, NN | $01 for 8 × 16 objects', () => {
    expect(decodeObject(oamWith([[16, 8, 0x21, 0]]), 0, TALL).tiles).toEqual([0x20, 0x21]);
  });

  it.each([
    [0, 50, 0, false],
    [160, 50, 0, false],
    [40, 0, 0, false],
    [40, 168, 0, false],
    [16, 8, 0, true],
    [154, 50, 0, true],
    [2, 50, 0, false],
    [2, 50, TALL, true],
    [0, 50, TALL, false],
  ])('Y %i, X %i, LCDC %i → visible %s', (y, x, lcdc, visible) => {
    expect(decodeObject(oamWith([[y, x, 0, 0]]), 0, lcdc).visible).toBe(visible);
  });
});
