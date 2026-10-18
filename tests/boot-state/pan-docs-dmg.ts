/**
 * DMG state at the hand-off to $0100, from Pan Docs "Power Up Sequence"
 * (https://gbdev.io/pandocs/Power_Up_Sequence.html, source gbdev/pandocs commit abeda62, retrieved
 * 2026-10-18, license CC0-1.0). Column "DMG" for CPU registers, column "DMG / MGB" for hardware
 * registers. Timing-sensitive values (DIV, STAT, LY) are recorded at PC = $0100.
 */
export const DMG_CPU = {
  a: 0x01,
  b: 0x00,
  c: 0x13,
  d: 0x00,
  e: 0xd8,
  h: 0x01,
  l: 0x4d,
  pc: 0x0100,
  sp: 0xfffe,
} as const;

/** F: Z = 1, N = 0; H and C are both 0 if the header checksum byte ($014D) is $00, otherwise both 1. */
export function dmgFlags(headerChecksumByte: number): number {
  return headerChecksumByte === 0 ? 0x80 : 0xb0;
}

/**
 * Hardware registers. Left out on purpose: OBP0/OBP1 ("left entirely uninitialized"), BANK ($FF50, "---"),
 * and all CGB-only registers ("---" for DMG).
 */
export const DMG_IO: readonly (readonly [name: string, address: number, value: number])[] = [
  ['P1', 0xff00, 0xcf],
  ['SB', 0xff01, 0x00],
  ['SC', 0xff02, 0x7e],
  ['DIV', 0xff04, 0xab],
  ['TIMA', 0xff05, 0x00],
  ['TMA', 0xff06, 0x00],
  ['TAC', 0xff07, 0xf8],
  ['IF', 0xff0f, 0xe1],
  ['NR10', 0xff10, 0x80],
  ['NR11', 0xff11, 0xbf],
  ['NR12', 0xff12, 0xf3],
  ['NR13', 0xff13, 0xff],
  ['NR14', 0xff14, 0xbf],
  ['NR21', 0xff16, 0x3f],
  ['NR22', 0xff17, 0x00],
  ['NR23', 0xff18, 0xff],
  ['NR24', 0xff19, 0xbf],
  ['NR30', 0xff1a, 0x7f],
  ['NR31', 0xff1b, 0xff],
  ['NR32', 0xff1c, 0x9f],
  ['NR33', 0xff1d, 0xff],
  ['NR34', 0xff1e, 0xbf],
  ['NR41', 0xff20, 0xff],
  ['NR42', 0xff21, 0x00],
  ['NR43', 0xff22, 0x00],
  ['NR44', 0xff23, 0xbf],
  ['NR50', 0xff24, 0x77],
  ['NR51', 0xff25, 0xf3],
  ['NR52', 0xff26, 0xf1],
  ['LCDC', 0xff40, 0x91],
  ['STAT', 0xff41, 0x85],
  ['SCY', 0xff42, 0x00],
  ['SCX', 0xff43, 0x00],
  ['LY', 0xff44, 0x00],
  ['LYC', 0xff45, 0x00],
  ['DMA', 0xff46, 0xff],
  ['BGP', 0xff47, 0xfc],
  ['WY', 0xff4a, 0x00],
  ['WX', 0xff4b, 0x00],
  ['IE', 0xffff, 0x00],
];
