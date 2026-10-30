import { describe, expect, it } from 'vitest';
import { analyze, CODE_NONE, CODE_REST, CODE_START } from '../../src/core/index.ts';

/** A 32 KiB ROM with its entry at $0100 jumping to $0150, and `body` from there. */
function rom(body: readonly number[], patch: Readonly<Record<number, number>> = {}, size = 0x8000) {
  const bytes = new Uint8Array(size);
  bytes.set([0x00, 0xc3, 0x50, 0x01], 0x100);
  bytes.set(body, 0x150);
  for (const [address, value] of Object.entries(patch)) bytes[Number(address)] = value;
  return bytes;
}
const marks = (r: Uint8Array, offset: number, bank = 0) => analyze(r).code[bank]?.[offset];

describe('conservative analysis (M3 R3)', () => {
  it('starts at $0100 and marks instructions', () => {
    const r = rom([0x76, 0xc9]);
    expect(marks(r, 0x100)).toBe(CODE_START);
    expect(marks(r, 0x101)).toBe(CODE_START);
    expect(marks(r, 0x102)).toBe(CODE_REST);
    expect(marks(r, 0x150)).toBe(CODE_START);
    expect(marks(r, 0x151)).toBe(CODE_START);
  });

  it('never takes the header for code', () => {
    const r = rom([], { 0x101: 0x00, 0x102: 0x00, 0x103: 0x00, 0x104: 0x76 });
    expect(marks(r, 0x103)).toBe(CODE_START);
    expect(marks(r, 0x104)).toBe(CODE_NONE);
  });

  it('skips vectors that hold filler, follows others', () => {
    const r = rom([0xc9], { 0x40: 0xd9, 0x48: 0xff, 0x50: 0x00 });
    expect(marks(r, 0x40)).toBe(CODE_START);
    expect(marks(r, 0x48)).toBe(CODE_NONE);
    expect(marks(r, 0x50)).toBe(CODE_NONE);
  });

  it('stops after a return and an unconditional jump, not after a conditional one', () => {
    const r = rom([0xc9, 0x76]);
    expect(marks(r, 0x151)).toBe(CODE_NONE);
    const conditional = rom([0x28, 0x00, 0x76, 0xc9, 0x76]);
    expect(marks(conditional, 0x152)).toBe(CODE_START);
    expect(marks(conditional, 0x154)).toBe(CODE_NONE);
  });

  it('does not follow an indirect jump', () => {
    const r = rom([0xe9, 0x76]);
    expect(marks(r, 0x151)).toBe(CODE_NONE);
  });

  it('follows static targets and labels them', () => {
    const r = rom([0xcd, 0x00, 0x02, 0xc9], { 0x200: 0xc9 });
    expect(marks(r, 0x200)).toBe(CODE_START);
    expect(analyze(r).labels[0]?.has(0x200)).toBe(true);
    expect(analyze(r).labels[0]?.has(0x150)).toBe(true);
  });

  it('follows rst and relative jumps backward', () => {
    const r = rom([0xcf, 0x18, 0xfd], { 0x08: 0xc9 });
    expect(marks(r, 0x08)).toBe(CODE_START);
    expect(analyze(r).labels[0]?.has(0x150)).toBe(true);
  });

  it('stops at an invalid opcode and at stop with another byte', () => {
    expect(marks(rom([0xd3, 0x76]), 0x151)).toBe(CODE_NONE);
    expect(marks(rom([0x10, 0x01, 0x76]), 0x150)).toBe(CODE_NONE);
    expect(marks(rom([0x10, 0x00, 0xc9]), 0x152)).toBe(CODE_START);
  });

  it('takes long runs of filler for data', () => {
    const r = rom([0x76, ...new Array<number>(16).fill(0xff), 0xc9]);
    expect(marks(r, 0x150)).toBe(CODE_START);
    expect(marks(r, 0x151)).toBe(CODE_NONE);
  });

  it('a target inside an instruction does not split it', () => {
    const r = rom([0x3e, 0xc9, 0xc3, 0x51, 0x01]); // ld a,$C9 then jp into its operand
    expect(marks(r, 0x151)).toBe(CODE_REST);
  });

  it('does not cross a bank boundary', () => {
    const r = rom([0xc3, 0xff, 0x3f], { 0x3fff: 0xc3 }, 0x10000);
    expect(marks(r, 0x3fff)).toBe(CODE_NONE);
    const short = rom([0xc3, 0xff, 0x7f], { 0x7fff: 0xc3 });
    expect(marks(short, 0x3fff, 1)).toBe(CODE_NONE);
  });

  it('with two banks follows into bank 1, with more it does not know the bank', () => {
    const two = rom([0xc3, 0x00, 0x40], { 0x4000: 0xc9 });
    expect(marks(two, 0, 1)).toBe(CODE_START);
    const four = rom([0xc3, 0x00, 0x40], { 0x4000: 0xc9 }, 0x10000);
    expect(marks(four, 0, 1)).toBe(CODE_NONE);
  });

  it('keeps unreached banks as data', () => {
    const r = rom([0xc9], { 0xc000: 0xc9 }, 0x10000);
    expect(analyze(r).code[3]?.some((m) => m !== CODE_NONE)).toBe(false);
    expect(analyze(r).bankCount).toBe(4);
  });

  it('does not follow targets in RAM', () => {
    const r = rom([0xcd, 0x00, 0xc0, 0xc9]);
    expect(marks(r, 0x153)).toBe(CODE_START);
    expect(analyze(r).labels[0]?.size).toBe(1);
  });
});
