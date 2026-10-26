import { describe, expect, it } from 'vitest';
import { BLOCKS, blockPicture, decodeTile, tileAddress, TILE_COUNT } from '../../src/core/inspect/tiles.ts';

describe('tile data (Pan Docs "Tile Data")', () => {
  it('decodes two bytes per row, bit 7 leftmost, low byte as bit 0 of the color index', () => {
    const bytes = new Uint8Array(16);
    bytes[0] = 0b1010_0000; // row 0 low
    bytes[1] = 0b1100_0000; // row 0 high
    const pixels = decodeTile(bytes);
    expect([...pixels.subarray(0, 4)]).toEqual([3, 2, 1, 0]);
    expect(pixels.length).toBe(64);
  });

  it('places the 384 tiles from $8000 in three blocks of 128', () => {
    expect(TILE_COUNT).toBe(384);
    expect([tileAddress(0), tileAddress(128), tileAddress(256), tileAddress(383)]).toEqual([0x8000, 0x8800, 0x9000, 0x97f0]);
    expect(BLOCKS.map((b) => [b.first, b.address])).toEqual([
      [0, 0x8000],
      [128, 0x8800],
      [256, 0x9000],
    ]);
  });

  it('draws a block as 16 × 8 tiles, optionally through a palette', () => {
    const vram = new Uint8Array(0x2000);
    vram.set([0xff, 0x00], 129 * 16); // tile 129, row 0: color index 1
    const raw = blockPicture(vram, 1, null);
    expect(raw.length).toBe(128 * 64);
    expect(raw[8]).toBe(1); // tile 129 is the second tile of block 1, x = 8
    expect(blockPicture(vram, 1, 0x1b)[8]).toBe(2); // $1B maps index 1 to shade 2
  });
});
