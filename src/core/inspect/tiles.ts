import { applyPalette, type ColorIndex } from './palette.ts';

/** Tile data per Pan Docs "Tile Data": 384 tiles of 8 × 8 pixels, 16 bytes each, from $8000 to $97FF. */
export const TILE_COUNT = 384;
export const TILE_BYTES = 16;
const VRAM_BASE = 0x8000;

/** The three blocks of 128 tiles: $8000, $8800, $9000. */
export const BLOCKS = [
  { index: 0, first: 0, address: 0x8000 },
  { index: 1, first: 128, address: 0x8800 },
  { index: 2, first: 256, address: 0x9000 },
] as const;

export const BLOCK_TILES_WIDE = 16;
export const BLOCK_TILES_HIGH = 8;

export function tileAddress(tile: number): number {
  return VRAM_BASE + tile * TILE_BYTES;
}

/** 64 color indices (row-major); per row the first byte holds bit 0, the second bit 1, bit 7 is the leftmost pixel. */
export function decodeTile(bytes: Uint8Array): Uint8Array {
  const pixels = new Uint8Array(64);
  for (let row = 0; row < 8; row++) {
    const low = bytes[row * 2] ?? 0;
    const high = bytes[row * 2 + 1] ?? 0;
    for (let x = 0; x < 8; x++) {
      const bit = 7 - x;
      pixels[row * 8 + x] = (((high >> bit) & 1) << 1) | ((low >> bit) & 1);
    }
  }
  return pixels;
}

/** The bytes of one tile from VRAM ($8000–$9FFF copy). */
export function tileBytes(vram: Uint8Array, tile: number): Uint8Array {
  return vram.subarray(tile * TILE_BYTES, (tile + 1) * TILE_BYTES);
}

/** Copies an 8 × 8 tile into a picture at (x, y), optionally through a palette register. */
export function drawTile(picture: Uint8Array, pictureWidth: number, pixels: Uint8Array, x: number, y: number, palette: number | null): void {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const index = (pixels[row * 8 + col] ?? 0) as ColorIndex;
      picture[(y + row) * pictureWidth + x + col] = palette === null ? index : applyPalette(index, palette);
    }
  }
}

/** One block as a 128 × 64 picture of color indices (16 × 8 tiles), raw or through BGP. */
export function blockPicture(vram: Uint8Array, block: 0 | 1 | 2, palette: number | null): Uint8Array {
  const width = BLOCK_TILES_WIDE * 8;
  const picture = new Uint8Array(width * BLOCK_TILES_HIGH * 8);
  const first = BLOCKS[block].first;
  for (let i = 0; i < 128; i++) {
    drawTile(picture, width, decodeTile(tileBytes(vram, first + i)), (i % BLOCK_TILES_WIDE) * 8, Math.floor(i / BLOCK_TILES_WIDE) * 8, palette);
  }
  return picture;
}
