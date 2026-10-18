export type MemoryRegionKind = 'rom-fixed' | 'rom-banked' | 'vram' | 'cart-ram' | 'wram' | 'echo' | 'oam' | 'unusable' | 'io' | 'hram' | 'ie';

export interface MemoryRegion {
  readonly start: number;
  readonly end: number;
  readonly name: string;
  readonly kind: MemoryRegionKind;
}

/**
 * DMG address space from Pan Docs "Memory Map" (CGB-only banking left out; DMG-01 only). WRAM is listed
 * as one 8 KiB block because both halves are fixed on the DMG.
 */
export const MEMORY_MAP: readonly MemoryRegion[] = [
  { start: 0x0000, end: 0x3fff, name: 'ROM bank 0 (fixed)', kind: 'rom-fixed' },
  { start: 0x4000, end: 0x7fff, name: 'ROM bank 1–N (switchable)', kind: 'rom-banked' },
  { start: 0x8000, end: 0x9fff, name: 'Video RAM', kind: 'vram' },
  { start: 0xa000, end: 0xbfff, name: 'Cartridge RAM', kind: 'cart-ram' },
  { start: 0xc000, end: 0xdfff, name: 'Work RAM', kind: 'wram' },
  { start: 0xe000, end: 0xfdff, name: 'Echo RAM (mirror of C000–DDFF)', kind: 'echo' },
  { start: 0xfe00, end: 0xfe9f, name: 'Object attribute memory (OAM)', kind: 'oam' },
  { start: 0xfea0, end: 0xfeff, name: 'Not usable', kind: 'unusable' },
  { start: 0xff00, end: 0xff7f, name: 'I/O registers', kind: 'io' },
  { start: 0xff80, end: 0xfffe, name: 'High RAM', kind: 'hram' },
  { start: 0xffff, end: 0xffff, name: 'Interrupt enable (IE)', kind: 'ie' },
];
