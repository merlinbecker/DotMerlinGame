// @vitest-environment node
import { describe, expect, it } from 'vitest';
import createRgbasm from '../../src/adapters/assembler/rgbds/generated/rgbasm.mjs';
import createRgblink from '../../src/adapters/assembler/rgbds/generated/rgblink.mjs';
import createRgbfix from '../../src/adapters/assembler/rgbds/generated/rgbfix.mjs';
import { runPipeline } from '../../src/adapters/assembler/rgbds/pipeline.ts';
import { decode, defaultSettings, encodeSource } from '../../src/core/index.ts';

const tools = { rgbasm: createRgbasm, rgblink: createRgblink, rgbfix: createRgbfix };
const INVALID = [0xd3, 0xdb, 0xdd, 0xe3, 0xe4, 0xeb, 0xec, 0xed, 0xf4, 0xfc, 0xfd];

async function assembles(cases: readonly Uint8Array[]) {
  const lines: string[] = ['SECTION "a",ROM0[0]'];
  const expected: number[] = [];
  for (const bytes of cases) {
    const instruction = decode(bytes, 0);
    if (!instruction) throw new Error(`no instruction for ${String(bytes[0])}`);
    lines.push(` ${instruction.text(null)}`);
    expected.push(...bytes.subarray(0, instruction.length));
  }
  const result = await runPipeline(tools, [{ path: 'main.asm', content: encodeSource(`${lines.join('\n')}\n`) }], { ...defaultSettings('x'), fixHeader: false });
  expect(result.diagnostics).toEqual([]);
  expect([...(result.rom ?? new Uint8Array()).subarray(0, expected.length)]).toEqual(expected);
}

describe('opcode table against rgbasm (M3 FR-011)', () => {
  it('rebuilds every base opcode, with low, high and negative operands', async () => {
    for (const operands of [[0x34, 0x12], [0x00, 0x00], [0x80, 0xff], [0x7f, 0x40]]) {
      const cases: Uint8Array[] = [];
      for (let op = 0; op < 0x100; op++) {
        if (op === 0xcb || INVALID.includes(op)) continue;
        cases.push(new Uint8Array([op, op === 0x10 ? 0 : (operands[0] ?? 0), operands[1] ?? 0]));
      }
      await assembles(cases);
    }
  });

  it('rebuilds every $CB opcode', async () => {
    await assembles(Array.from({ length: 256 }, (_, op) => new Uint8Array([0xcb, op])));
  });

  it('knows the invalid opcodes and stop with another second byte', () => {
    for (const op of INVALID) expect(decode(new Uint8Array([op, 0, 0]), 0)).toBeNull();
    expect(decode(new Uint8Array([0x10, 0x01]), 0)).toBeNull();
  });

  it('refuses an instruction over the end', () => {
    expect(decode(new Uint8Array([0xc3, 0, 0]), 0, 2)).toBeNull();
    expect(decode(new Uint8Array([0xcb, 0]), 0, 1)).toBeNull();
    expect(decode(new Uint8Array([0x3e, 0]), 0, 1)).toBeNull();
  });
});
