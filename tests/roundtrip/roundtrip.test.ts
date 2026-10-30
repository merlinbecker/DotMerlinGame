// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import createRgbasm from '../../src/adapters/assembler/rgbds/generated/rgbasm.mjs';
import createRgbfix from '../../src/adapters/assembler/rgbds/generated/rgbfix.mjs';
import createRgblink from '../../src/adapters/assembler/rgbds/generated/rgblink.mjs';
import { runPipeline } from '../../src/adapters/assembler/rgbds/pipeline.ts';
import { analyze, CODE_NONE, CODE_START, compareBuild, generateSource } from '../../src/core/index.ts';

const tools = { rgbasm: createRgbasm, rgblink: createRgblink, rgbfix: createRgbfix };
const ROMS = readdirSync('tests/roms/build').filter((file) => file.endsWith('.gb'));

async function roundtrip(rom: Uint8Array, name: string) {
  const { files, settings } = await generateSource(rom, name);
  const result = await runPipeline(tools, files, settings);
  expect(result.diagnostics).toEqual([]);
  return compareBuild(rom, result.rom ?? new Uint8Array());
}

describe('ROM → source → build (M3 SC-001)', () => {
  it('covers the test ROMs, also invalid headers and several banks', () => {
    expect(ROMS).toEqual(expect.arrayContaining(['bad-logo.gb', 'bad-checksum.gb', 'mbc5.gb', 'inspect-mem.gb', 'known-split.gb']));
  });

  it.each(ROMS)('%s is byte-identical', async (file) => {
    expect(await roundtrip(new Uint8Array(readFileSync(`tests/roms/build/${file}`)), file)).toEqual({ verdict: 'identical', paddedBytes: 0 });
  });

  it('holds for bytes that are no program at all', async () => {
    const rom = new Uint8Array(0x10000);
    let state = 12345;
    for (let i = 0; i < rom.length; i++) {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      rom[i] = state >> 16;
    }
    expect((await roundtrip(rom, 'noise.gb')).verdict).toBe('identical');
  });

  it('holds with every opcode reached from the entry point', async () => {
    const rom = new Uint8Array(0x8000);
    rom.set([0x00, 0xc3, 0x50, 0x01], 0x100);
    let at = 0x150;
    for (let op = 0; op < 0x100; op++) {
      rom.set([op, 0x10, 0x20], at);
      at += 3;
    }
    expect((await roundtrip(rom, 'all.gb')).verdict).toBe('identical');
  });

  it('holds for jumps near the ends of the address space', async () => {
    const rom = new Uint8Array(0x8000);
    rom.set([0x18, 0x80], 0); // relative target below $0000
    rom.set([0x00, 0xc3, 0x00, 0x00], 0x100);
    rom.set([0x18, 0x7f], 0x7ffe);
    expect((await roundtrip(rom, 'edges.gb')).verdict).toBe('identical');
  });

  it('reports the filled tail of a size that is no multiple of 16 KiB', async () => {
    expect(await roundtrip(new Uint8Array(0x5000).fill(0x11), 'short.gb')).toEqual({ verdict: 'padded', paddedBytes: 0x3000 });
    expect(await roundtrip(new Uint8Array(100).fill(0x11), 'tiny.gb')).toEqual({ verdict: 'padded', paddedBytes: 0x4000 - 100 });
  });
});

describe('known split of code and data (M3 SC-002)', () => {
  const analysis = analyze(new Uint8Array(readFileSync('tests/roms/build/known-split.gb')));
  const code = analysis.code[0] ?? new Uint8Array();

  it('finds the code', () => {
    expect(code[0x150]).toBe(CODE_START);
    expect(code[0x40]).toBe(CODE_START);
  });

  it.each([['Table', 0x200, 2], ['Hidden', 0x300, 2], ['Data', 0x400, 5]])('leaves %s as data', (_name, start, length) => {
    for (let i = start; i < start + length; i++) expect(code[i]).toBe(CODE_NONE);
  });
});
