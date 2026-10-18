import { NINTENDO_LOGO_SHA256 } from './logo-hash.generated.ts';

/** All offsets and codes: Pan Docs "The Cartridge Header". */
const LOGO_START = 0x0104;
const LOGO_END = 0x0133;
const TITLE_START = 0x0134;
const CGB_FLAG = 0x0143;
const CART_TYPE = 0x0147;
const ROM_SIZE = 0x0148;
const RAM_SIZE = 0x0149;
const HEADER_CHECKSUM = 0x014d;
const HEADER_END = 0x0150;

export type Mbc = 'none' | 'mbc1' | 'mbc3' | 'mbc5' | 'other';

export interface CartridgeType {
  readonly code: number;
  readonly mbc: Mbc;
  readonly ram: boolean;
  readonly battery: boolean;
}

export interface RomHeaderInfo {
  readonly title: string;
  readonly cartridgeType: CartridgeType;
  readonly romSizeBytes: number;
  readonly romBanks: number;
  readonly ramSizeBytes: number;
  readonly cgbFlag: 'dmg' | 'cgb-compatible' | 'cgb-only';
  readonly headerChecksumValid: boolean;
  readonly logoValid: boolean;
}

export type RomRejectReason = 'invalid' | 'cgb-only' | 'unsupported-cartridge';

export type LoadValidation = { readonly ok: true; readonly info: RomHeaderInfo } | { readonly ok: false; readonly reason: RomRejectReason };

const CARTRIDGE_TYPES: ReadonlyMap<number, Omit<CartridgeType, 'code'>> = new Map([
  [0x00, { mbc: 'none', ram: false, battery: false }],
  [0x01, { mbc: 'mbc1', ram: false, battery: false }],
  [0x02, { mbc: 'mbc1', ram: true, battery: false }],
  [0x03, { mbc: 'mbc1', ram: true, battery: true }],
  [0x05, { mbc: 'other', ram: false, battery: false }], // MBC2
  [0x06, { mbc: 'other', ram: false, battery: true }], // MBC2+BATTERY
  [0x08, { mbc: 'none', ram: true, battery: false }], // ROM+RAM
  [0x09, { mbc: 'none', ram: true, battery: true }], // ROM+RAM+BATTERY
  [0x0b, { mbc: 'other', ram: false, battery: false }], // MMM01
  [0x0c, { mbc: 'other', ram: true, battery: false }],
  [0x0d, { mbc: 'other', ram: true, battery: true }],
  [0x0f, { mbc: 'mbc3', ram: false, battery: true }], // MBC3+TIMER+BATTERY
  [0x10, { mbc: 'mbc3', ram: true, battery: true }], // MBC3+TIMER+RAM+BATTERY
  [0x11, { mbc: 'mbc3', ram: false, battery: false }],
  [0x12, { mbc: 'mbc3', ram: true, battery: false }],
  [0x13, { mbc: 'mbc3', ram: true, battery: true }],
  [0x19, { mbc: 'mbc5', ram: false, battery: false }],
  [0x1a, { mbc: 'mbc5', ram: true, battery: false }],
  [0x1b, { mbc: 'mbc5', ram: true, battery: true }],
  [0x1c, { mbc: 'mbc5', ram: false, battery: false }], // +RUMBLE
  [0x1d, { mbc: 'mbc5', ram: true, battery: false }],
  [0x1e, { mbc: 'mbc5', ram: true, battery: true }],
  [0x20, { mbc: 'other', ram: false, battery: false }], // MBC6
  [0x22, { mbc: 'other', ram: true, battery: true }], // MBC7+SENSOR+RUMBLE+RAM+BATTERY
  [0xfc, { mbc: 'other', ram: false, battery: false }], // POCKET CAMERA
  [0xfd, { mbc: 'other', ram: false, battery: false }], // BANDAI TAMA5
  [0xfe, { mbc: 'other', ram: false, battery: false }], // HuC3
  [0xff, { mbc: 'other', ram: true, battery: true }], // HuC1+RAM+BATTERY
]);

/** RAM size codes; $01 is "unused" per Pan Docs and treated as no RAM. */
const RAM_SIZES: ReadonlyMap<number, number> = new Map([
  [0x00, 0],
  [0x01, 0],
  [0x02, 8 * 1024],
  [0x03, 32 * 1024],
  [0x04, 128 * 1024],
  [0x05, 64 * 1024],
]);

/** ROM size: 32 KiB × (1 << value) for $00–$08; the unofficial $52–$54 are not supported. */
function romSize(code: number): number | undefined {
  return code <= 0x08 ? 32 * 1024 * (1 << code) : undefined;
}

/** Pan Docs "014D — Header checksum". */
export function computeHeaderChecksum(rom: Uint8Array): number {
  let checksum = 0;
  for (let address = TITLE_START; address <= 0x014c; address++) checksum = (checksum - (rom[address] ?? 0) - 1) & 0xff;
  return checksum;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Compares the header logo by hash; the logo bytes are not part of this repository (ADR-0004). */
export async function logoMatches(rom: Uint8Array): Promise<boolean> {
  return (await sha256Hex(rom.subarray(LOGO_START, LOGO_END + 1))) === NINTENDO_LOGO_SHA256;
}

function cgbFlag(value: number): RomHeaderInfo['cgbFlag'] {
  if (value === 0xc0) return 'cgb-only';
  return (value & 0x80) !== 0 ? 'cgb-compatible' : 'dmg';
}

function readTitle(rom: Uint8Array, cgb: boolean): string {
  const end = cgb ? CGB_FLAG : CGB_FLAG + 1;
  let title = '';
  for (let address = TITLE_START; address < end; address++) {
    const byte = rom[address] ?? 0;
    if (byte === 0) break;
    title += byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : '?';
  }
  return title.trimEnd();
}

/** Reads the header; requires at least $0150 bytes. Unknown codes yield 0 sizes / mbc 'other'. */
export async function parseHeader(rom: Uint8Array): Promise<RomHeaderInfo> {
  const typeCode = rom[CART_TYPE] ?? 0;
  const type = CARTRIDGE_TYPES.get(typeCode) ?? { mbc: 'other', ram: false, battery: false };
  const romSizeBytes = romSize(rom[ROM_SIZE] ?? 0xff) ?? 0;
  const flag = cgbFlag(rom[CGB_FLAG] ?? 0);
  return {
    title: readTitle(rom, flag !== 'dmg'),
    cartridgeType: { code: typeCode, ...type },
    romSizeBytes,
    romBanks: romSizeBytes / (16 * 1024),
    ramSizeBytes: RAM_SIZES.get(rom[RAM_SIZE] ?? 0) ?? 0,
    cgbFlag: flag,
    headerChecksumValid: computeHeaderChecksum(rom) === rom[HEADER_CHECKSUM],
    logoValid: await logoMatches(rom),
  };
}

/** Load rules from data-model.md; header logo and checksum are only checked in hardware-near mode. */
export async function validateForLoad(rom: Uint8Array): Promise<LoadValidation> {
  if (rom.length < HEADER_END) return { ok: false, reason: 'invalid' };
  const expectedSize = romSize(rom[ROM_SIZE] ?? 0xff);
  if (expectedSize === undefined || expectedSize !== rom.length) return { ok: false, reason: 'invalid' };
  const info = await parseHeader(rom);
  if (info.cgbFlag === 'cgb-only') return { ok: false, reason: 'cgb-only' };
  if (!CARTRIDGE_TYPES.has(info.cartridgeType.code)) return { ok: false, reason: 'unsupported-cartridge' };
  return { ok: true, info };
}
