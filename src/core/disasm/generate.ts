import { addressOf, BANK_SIZE, CODE_REST, CODE_START, labelName, resolveTarget, type Analysis } from './analyze.ts';
import { decode, relativeTarget } from './opcodes.ts';

const BYTES_PER_LINE = 16;
const RUN_LENGTH = 32;
const MAIN = 'main.asm';

/** Pan Docs "The Cartridge Header". */
const HEADER_FIELDS: readonly (readonly [number, string])[] = [
  [0x0100, 'Entry point'],
  [0x0104, 'Nintendo logo'],
  [0x0134, 'Title'],
  [0x0143, 'CGB flag'],
  [0x0144, 'New licensee code'],
  [0x0146, 'SGB flag'],
  [0x0147, 'Cartridge type'],
  [0x0148, 'ROM size'],
  [0x0149, 'RAM size'],
  [0x014a, 'Destination code'],
  [0x014b, 'Old licensee code'],
  [0x014c, 'Mask ROM version'],
  [0x014d, 'Header checksum'],
  [0x014e, 'Global checksum'],
  [0x0150, 'End of the cartridge header'],
];
const COMMENTS: ReadonlyMap<number, string> = new Map(HEADER_FIELDS);

const hex2 = (byte: number) => `$${byte.toString(16).toUpperCase().padStart(2, '0')}`;
const hex4 = (word: number) => `$${word.toString(16).toUpperCase().padStart(4, '0')}`;

export const bankFileName = (bank: number) => `bank_${bank.toString().padStart(3, '0')}.asm`;

/** The source of one bank: one section, code where it is certain, data elsewhere. */
export function generateBank(rom: Uint8Array, analysis: Analysis, bank: number): string {
  const start = bank * BANK_SIZE;
  const size = Math.min(BANK_SIZE, rom.length - start);
  const marks = analysis.code[bank] ?? new Uint8Array();
  const labels = analysis.labels[bank] ?? new Set<number>();
  const lines: string[] = [bank === 0 ? 'SECTION "Bank 0", ROM0[$0000]' : `SECTION "Bank ${String(bank)}", ROMX[$4000], BANK[${String(bank)}]`, ''];

  const breaksAt = (offset: number) => labels.has(offset) || (bank === 0 && COMMENTS.has(offset)) || marks[offset] === CODE_START;
  const labelFor = (target: number, relative: boolean) => {
    const place = resolveTarget(bank, analysis.bankCount, target);
    if (!place || (relative && place.bank !== bank)) return null;
    if (analysis.code[place.bank]?.[place.offset] === CODE_REST) return null; // inside an instruction: the number stays
    return analysis.labels[place.bank]?.has(place.offset) ? labelName(place.bank, addressOf(place.bank, place.offset)) : null;
  };

  let offset = 0;
  while (offset < size) {
    if (bank === 0 && COMMENTS.has(offset)) lines.push('', `; ${COMMENTS.get(offset) ?? ''} (${hex4(offset)})`);
    if (labels.has(offset)) lines.push(`${labelName(bank, addressOf(bank, offset))}:`);

    if (marks[offset] === CODE_START) {
      const index = start + offset;
      const instruction = decode(rom, index, start + size);
      if (instruction) {
        const address = addressOf(bank, offset);
        const relativeJump = relativeTarget(rom, index, address);
        const label = relativeJump !== null ? labelFor(relativeJump, true) : instruction.target !== null ? labelFor(instruction.target, false) : null;
        lines.push(`    ${instruction.text(label)}`);
        offset += instruction.length;
        continue;
      }
    }

    let end = offset + 1;
    while (end < size && !breaksAt(end)) end++;
    offset = emitData(rom, start, offset, end, lines);
  }
  return `${lines.join('\n')}\n`;
}

/** Bytes as `db`, long runs as `ds`; byte-identical either way. */
function emitData(rom: Uint8Array, start: number, from: number, end: number, lines: string[]): number {
  let offset = from;
  while (offset < end) {
    const byte = rom[start + offset] ?? 0;
    let run = 1;
    while (offset + run < end && rom[start + offset + run] === byte) run++;
    if (run >= RUN_LENGTH) {
      lines.push(`    ds ${String(run)}, ${hex2(byte)}`);
      offset += run;
      continue;
    }
    const count = Math.min(BYTES_PER_LINE, end - offset);
    lines.push(`    db ${Array.from(rom.subarray(start + offset, start + offset + count), hex2).join(', ')}`);
    offset += count;
  }
  return end;
}

export function generateMain(rom: Uint8Array, analysis: Analysis, name: string): string {
  const padded = rom.length % BANK_SIZE === 0 ? 0 : BANK_SIZE - (rom.length % BANK_SIZE);
  const notes = [
    `; Imported from ${name} with a conservative analysis: code only where it is certain, everything else is data.`,
    '; Labels are named after their bank and address. Rename them as you like.',
    '; The header is kept as it was: rgbfix does not run for this project (Project > Settings).',
  ];
  if (padded > 0) notes.push(`; The ROM size is no multiple of 16 KiB: the linker adds ${String(padded)} bytes at the end.`);
  const includes = Array.from({ length: analysis.bankCount }, (_, bank) => `INCLUDE "${bankFileName(bank)}"`);
  return `${[...notes, '', ...includes].join('\n')}\n`;
}

/** The printable start of the header title. */
export function headerTitle(rom: Uint8Array): string {
  let title = '';
  for (let i = 0x134; i < 0x144; i++) {
    const byte = rom[i] ?? 0;
    if (byte < 0x20 || byte > 0x7e) break;
    title += String.fromCharCode(byte);
  }
  return title.trim();
}

export { MAIN as MAIN_FILE };
