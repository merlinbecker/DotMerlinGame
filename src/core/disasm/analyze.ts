import { decode, relativeTarget } from './opcodes.ts';

export const BANK_SIZE = 0x4000;
const HEADER_START = 0x0104;
const HEADER_END = 0x0150;
const ENTRY = 0x0100;
/** Pan Docs "Reset vectors" ($00–$38) and "Interrupts" ($40–$60). */
const VECTORS = [0x00, 0x08, 0x10, 0x18, 0x20, 0x28, 0x30, 0x38, 0x40, 0x48, 0x50, 0x58, 0x60];
const FILLER_RUN = 16;

export const CODE_NONE = 0;
export const CODE_START = 1;
export const CODE_REST = 2;

export interface Analysis {
  readonly bankCount: number;
  /** Per bank, one mark per byte: none, start of an instruction, or the rest of one. */
  readonly code: readonly Uint8Array[];
  /** Per bank, offsets that are targets of a static jump or call. */
  readonly labels: readonly ReadonlySet<number>[];
}

export const addressOf = (bank: number, offset: number) => (bank === 0 ? offset : BANK_SIZE + offset);

export function labelName(bank: number, address: number): string {
  return `L${bank.toString().padStart(3, '0')}_${address.toString(16).toUpperCase().padStart(4, '0')}`;
}

function bankRange(rom: Uint8Array, bank: number): [number, number] {
  const start = bank * BANK_SIZE;
  return [start, Math.min(start + BANK_SIZE, rom.length)];
}

/** Where a 16-bit target lies, if that is certain (research.md R3). */
export function resolveTarget(fromBank: number, bankCount: number, target: number): { bank: number; offset: number } | null {
  if (target < 0) return null;
  if (target < BANK_SIZE) return { bank: 0, offset: target };
  if (target >= 2 * BANK_SIZE) return null;
  if (fromBank >= 1) return { bank: fromBank, offset: target - BANK_SIZE };
  // From bank 0 the mapped bank is unknown, unless the ROM has only one bank to map.
  return bankCount === 2 ? { bank: 1, offset: target - BANK_SIZE } : null;
}

function isFiller(rom: Uint8Array, index: number, end: number): boolean {
  const byte = rom[index];
  if ((byte !== 0x00 && byte !== 0xff) || index + FILLER_RUN > end) return false;
  for (let i = 1; i < FILLER_RUN; i++) if (rom[index + i] !== byte) return false;
  return true;
}

/** Conservative code discovery: only what is reachable from the entry points through static targets. */
export function analyze(rom: Uint8Array): Analysis {
  const bankCount = Math.max(1, Math.ceil(rom.length / BANK_SIZE));
  const code = Array.from({ length: bankCount }, () => new Uint8Array(BANK_SIZE));
  const labels = Array.from({ length: bankCount }, () => new Set<number>());
  const work: { bank: number; offset: number }[] = [];
  if (rom.length > ENTRY) work.push({ bank: 0, offset: ENTRY });
  for (const vector of VECTORS) {
    const first = rom[vector];
    if (first !== undefined && first !== 0x00 && first !== 0xff) work.push({ bank: 0, offset: vector });
  }

  const inBounds = (bank: number, offset: number) => {
    const [start, end] = bankRange(rom, bank);
    return bank < bankCount && offset >= 0 && start + offset < end;
  };

  for (let next = work.pop(); next; next = work.pop()) {
    const { bank } = next;
    let { offset } = next;
    const marks = code[bank];
    if (!marks) continue;
    const [start, end] = bankRange(rom, bank);
    for (;;) {
      if (marks[offset] !== CODE_NONE) break; // known already, or inside another instruction
      const index = start + offset;
      if (bank === 0 && offset >= HEADER_START && offset < HEADER_END) break;
      if (isFiller(rom, index, end)) break;
      const instruction = decode(rom, index, end);
      if (!instruction) break;
      const span = instruction.length;
      let free = true;
      for (let i = 1; i < span; i++) {
        if (marks[offset + i] !== CODE_NONE || (bank === 0 && offset + i >= HEADER_START && offset + i < HEADER_END)) free = false;
      }
      if (!free) break;
      marks[offset] = CODE_START;
      for (let i = 1; i < span; i++) marks[offset + i] = CODE_REST;

      const target = instruction.target ?? relativeTarget(rom, index, addressOf(bank, offset));
      if (target !== null) {
        const place = resolveTarget(bank, bankCount, target);
        if (place && inBounds(place.bank, place.offset)) {
          labels[place.bank]?.add(place.offset);
          work.push(place);
        }
      }
      if (instruction.flow === 'jump' || instruction.flow === 'end') break;
      offset += span;
      if (start + offset >= end) break; // no fall-through over the end of a bank
    }
  }
  return { bankCount, code, labels };
}
