import { drawTile, decodeTile, tileBytes } from './tiles.ts';

export type MapKind = 'background' | 'window';

/** 32 × 32 entries, 8 × 8 pixels each: 256 × 256 pixels (Pan Docs "Tile Maps"). */
export const MAP_TILES = 32;
export const MAP_PIXELS = 256;
const SCREEN_WIDTH = 160;
const SCREEN_HEIGHT = 144;

// LCDC bits per Pan Docs "LCDC".
const LCDC_WINDOW_MAP = 0x40;
const LCDC_WINDOW_ON = 0x20;
const LCDC_TILES_8000 = 0x10;
const LCDC_BG_MAP = 0x08;

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** $9800 or $9C00: LCDC bit 3 for the background, bit 6 for the window. */
export function mapBase(lcdc: number, kind: MapKind): number {
  const bit = kind === 'background' ? LCDC_BG_MAP : LCDC_WINDOW_MAP;
  return lcdc & bit ? 0x9c00 : 0x9800;
}

export function windowEnabled(lcdc: number): boolean {
  return (lcdc & LCDC_WINDOW_ON) !== 0;
}

/**
 * Tile 0–383 for a map entry (Pan Docs "Tile Data"): with LCDC bit 4 set the "$8000 method" (unsigned),
 * otherwise the "$8800 method": entries 0–127 from block 2 (tiles 256–383), 128–255 from block 1.
 */
export function tileIndexFor(entry: number, lcdc: number): number {
  if (lcdc & LCDC_TILES_8000) return entry;
  return entry < 128 ? 256 + entry : entry;
}

function spans(start: number, length: number): [number, number][] {
  const first = Math.min(length, MAP_PIXELS - start);
  return first === length ? [[start, length]] : [[start, first], [0, length - first]];
}

/** The 160 × 144 screen area on the map, starting at (SCX, SCY) and wrapping at the edges (Pan Docs "Scrolling"). */
export function viewport(scx: number, scy: number): Rect[] {
  const rects: Rect[] = [];
  for (const [y, height] of spans(scy, SCREEN_HEIGHT)) for (const [x, width] of spans(scx, SCREEN_WIDTH)) rects.push({ x, y, width, height });
  return rects;
}

/** Screen position of the window's top left corner: (WX − 7, WY). */
export function windowOrigin(wx: number, wy: number): { x: number; y: number } {
  return { x: wx - 7, y: wy };
}

/** The whole map as 256 × 256 color indices, raw or through BGP. `vram` is the $8000–$9FFF copy. */
export function mapPicture(vram: Uint8Array, lcdc: number, kind: MapKind, palette: number | null): Uint8Array {
  const picture = new Uint8Array(MAP_PIXELS * MAP_PIXELS);
  const base = mapBase(lcdc, kind) - 0x8000;
  const decoded = new Map<number, Uint8Array>();
  for (let i = 0; i < MAP_TILES * MAP_TILES; i++) {
    const tile = tileIndexFor(vram[base + i] ?? 0, lcdc);
    let pixels = decoded.get(tile);
    if (!pixels) {
      pixels = decodeTile(tileBytes(vram, tile));
      decoded.set(tile, pixels);
    }
    drawTile(picture, MAP_PIXELS, pixels, (i % MAP_TILES) * 8, Math.floor(i / MAP_TILES) * 8, palette);
  }
  return picture;
}
