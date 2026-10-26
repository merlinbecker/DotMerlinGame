/**
 * Short names of the DMG I/O registers (Pan Docs "Hardware Registers", gbdev/pandocs commit 8dc19b1): all
 * rows with model "All" or "DMG"; CGB-only rows have no name here. Bit meanings come with the debugger (M4).
 */
const NAMED: readonly (readonly [number, string])[] = [
  [0xff00, 'P1/JOYP'],
  [0xff01, 'SB'],
  [0xff02, 'SC'],
  [0xff04, 'DIV'],
  [0xff05, 'TIMA'],
  [0xff06, 'TMA'],
  [0xff07, 'TAC'],
  [0xff0f, 'IF'],
  [0xff10, 'NR10'],
  [0xff11, 'NR11'],
  [0xff12, 'NR12'],
  [0xff13, 'NR13'],
  [0xff14, 'NR14'],
  [0xff16, 'NR21'],
  [0xff17, 'NR22'],
  [0xff18, 'NR23'],
  [0xff19, 'NR24'],
  [0xff1a, 'NR30'],
  [0xff1b, 'NR31'],
  [0xff1c, 'NR32'],
  [0xff1d, 'NR33'],
  [0xff1e, 'NR34'],
  [0xff20, 'NR41'],
  [0xff21, 'NR42'],
  [0xff22, 'NR43'],
  [0xff23, 'NR44'],
  [0xff24, 'NR50'],
  [0xff25, 'NR51'],
  [0xff26, 'NR52'],
  [0xff40, 'LCDC'],
  [0xff41, 'STAT'],
  [0xff42, 'SCY'],
  [0xff43, 'SCX'],
  [0xff44, 'LY'],
  [0xff45, 'LYC'],
  [0xff46, 'DMA'],
  [0xff47, 'BGP'],
  [0xff48, 'OBP0'],
  [0xff49, 'OBP1'],
  [0xff4a, 'WY'],
  [0xff4b, 'WX'],
  [0xff50, 'BANK'],
];

/** $FF30–$FF3F, one table row in Pan Docs. */
const WAVE_RAM_START = 0xff30;
const WAVE_RAM_END = 0xff3f;
const WAVE_RAM = 'Wave RAM';

/** Address → short name; the wave RAM range counts as one entry (43 in total). */
export const IO_REGISTER_NAMES: ReadonlyMap<number, string> = new Map([...NAMED, [WAVE_RAM_START, WAVE_RAM]]);

export function ioRegisterName(address: number): string | null {
  if (address >= WAVE_RAM_START && address <= WAVE_RAM_END) return WAVE_RAM;
  return IO_REGISTER_NAMES.get(address) ?? null;
}
