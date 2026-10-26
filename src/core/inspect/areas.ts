import type { InspectionSnapshot } from '../events/frame-state.ts';
import { MEMORY_MAP, type MemoryRegionKind } from '../rom/memory-map.ts';

/** Areas the Hex view offers (FR-004); echo RAM and $FEA0–$FEFF hold no memory of their own. */
export type HexArea = 'rom' | 'vram' | 'cart-ram' | 'wram' | 'oam' | 'io' | 'hram' | 'ie';

export interface HexAreaInfo {
  readonly id: HexArea;
  readonly label: string;
}

export const HEX_AREAS: readonly HexAreaInfo[] = [
  { id: 'rom', label: 'ROM' },
  { id: 'vram', label: 'VRAM' },
  { id: 'cart-ram', label: 'Cart RAM' },
  { id: 'wram', label: 'WRAM' },
  { id: 'oam', label: 'OAM' },
  { id: 'io', label: 'I/O' },
  { id: 'hram', label: 'HRAM' },
  { id: 'ie', label: 'IE' },
];

const ROM_BANK = 0x4000;
const CART_RAM_BANK = 0x2000;

/** Start address of a region from the M1 memory map (Pan Docs "Memory Map"). */
function base(kind: MemoryRegionKind): number {
  const region = MEMORY_MAP.find((r) => r.kind === kind);
  if (!region) throw new Error(`memory map has no ${kind}`);
  return region.start;
}

/** Number of banks to choose from: ROM and cartridge RAM are banked, the rest has one, missing RAM none. */
export function areaBanks(area: HexArea, inspection: InspectionSnapshot): number {
  if (area === 'rom') return Math.ceil(inspection.rom.length / ROM_BANK);
  if (area === 'cart-ram') return inspection.cartRam?.bankCount ?? 0;
  return 1;
}

export interface AreaBytes {
  /** CPU address of bytes[0]. */
  readonly base: number;
  readonly bytes: Uint8Array;
}

/** The bytes of one bank of an area, or null if the area or bank does not exist (never invented values). */
export function bytesOf(area: HexArea, bank: number, inspection: InspectionSnapshot): AreaBytes | null {
  if (bank < 0 || bank >= areaBanks(area, inspection)) return null;
  switch (area) {
    case 'rom':
      return {
        base: bank === 0 ? base('rom-fixed') : base('rom-banked'),
        bytes: inspection.rom.subarray(bank * ROM_BANK, (bank + 1) * ROM_BANK),
      };
    case 'cart-ram': {
      const ram = inspection.cartRam;
      return ram && { base: base('cart-ram'), bytes: ram.bytes.subarray(bank * CART_RAM_BANK, (bank + 1) * CART_RAM_BANK) };
    }
    case 'vram':
      return { base: base('vram'), bytes: inspection.vram };
    case 'wram':
      return { base: base('wram'), bytes: inspection.wram };
    case 'oam':
      return { base: base('oam'), bytes: inspection.oam };
    case 'io':
      return { base: base('io'), bytes: inspection.io };
    case 'hram':
      return { base: base('hram'), bytes: inspection.hram };
    case 'ie':
      return { base: base('ie'), bytes: Uint8Array.of(inspection.ie) };
  }
}
