/** Object attribute memory per Pan Docs "OAM": 40 entries of Y, X, tile index and attributes. */
export const OBJECT_COUNT = 40;
const ENTRY_BYTES = 4;
const SCREEN_WIDTH = 160;
const SCREEN_HEIGHT = 144;
/** LCDC bit 2: 8 × 16 objects (Pan Docs "LCDC"). */
const LCDC_OBJ_16 = 0x04;

export interface ObjectEntry {
  readonly index: number;
  /** Raw Y: screen Y + 16. */
  readonly y: number;
  /** Raw X: screen X + 8. */
  readonly x: number;
  readonly tile: number;
  /** One tile for 8 × 8; top NN & $FE and bottom NN | $01 for 8 × 16. */
  readonly tiles: readonly number[];
  /** Attribute bit 7: BG and window colors 1–3 drawn over the object. */
  readonly priority: boolean;
  /** Bit 6 */
  readonly flipY: boolean;
  /** Bit 5 */
  readonly flipX: boolean;
  /** Bit 4: OBP0 or OBP1. */
  readonly palette: 0 | 1;
  /** Any part of the object lies on the 160 × 144 screen. */
  readonly visible: boolean;
}

export function objectHeight(lcdc: number): 8 | 16 {
  return lcdc & LCDC_OBJ_16 ? 16 : 8;
}

export function decodeObject(oam: Uint8Array, index: number, lcdc: number): ObjectEntry {
  const at = index * ENTRY_BYTES;
  const y = oam[at] ?? 0;
  const x = oam[at + 1] ?? 0;
  const tile = oam[at + 2] ?? 0;
  const attributes = oam[at + 3] ?? 0;
  const height = objectHeight(lcdc);
  const top = y - 16;
  const left = x - 8;
  return {
    index,
    y,
    x,
    tile,
    tiles: height === 16 ? [tile & 0xfe, tile | 0x01] : [tile],
    priority: (attributes & 0x80) !== 0,
    flipY: (attributes & 0x40) !== 0,
    flipX: (attributes & 0x20) !== 0,
    palette: attributes & 0x10 ? 1 : 0,
    visible: top + height > 0 && top < SCREEN_HEIGHT && left + 8 > 0 && left < SCREEN_WIDTH,
  };
}
