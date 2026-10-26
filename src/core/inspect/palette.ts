export type ColorIndex = 0 | 1 | 2 | 3;

/**
 * Maps a color index through a DMG palette register (BGP, OBP0, OBP1): bits 1-0 give the shade of index 0,
 * bits 3-2 index 1, bits 5-4 index 2, bits 7-6 index 3; shade 0 is white, 3 black (Pan Docs "Palettes",
 * FF47 — BGP).
 */
export function applyPalette(index: ColorIndex, palette: number): ColorIndex {
  return ((palette >> (index * 2)) & 0b11) as ColorIndex;
}
