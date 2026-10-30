// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runPipeline, type RgbdsTools } from '../../src/adapters/assembler/rgbds/pipeline.ts';
import createRgbasm from '../../src/adapters/assembler/rgbds/generated/rgbasm.mjs';
import createRgbfix from '../../src/adapters/assembler/rgbds/generated/rgbfix.mjs';
import createRgblink from '../../src/adapters/assembler/rgbds/generated/rgblink.mjs';
import { computeHeaderChecksum, defaultSettings, encodeSource, logoMatches, MBC_OPTIONS, RAM_SIZE_OPTIONS, type ProjectSettings } from '../../src/core/index.ts';

const tools: RgbdsTools = { rgbasm: createRgbasm, rgblink: createRgblink, rgbfix: createRgbfix };
const settings: ProjectSettings = { ...defaultSettings('test'), title: 'TEST' };
const text = (path: string, content: string) => ({ path, content: encodeSource(content) });
const ENTRY_POINT = 'SECTION "h",ROM0[$100]\n nop\n jp $150\n ds $150-@, 0\nSECTION "m",ROM0[$150]\nloop: jr loop\n';

describe('RGBDS WASM pipeline', () => {
  it('builds the same ROM as the native RGBDS of the same version', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'rgbds-'));
    const source = readFileSync('tests/roms/src/pattern.asm');
    const include = readFileSync('tests/roms/src/hardware.inc');
    writeFileSync(join(tmp, 'main.asm'), source);
    writeFileSync(join(tmp, 'hardware.inc'), include);
    const tool = (name: string, ...args: string[]) => execFileSync(join(process.cwd(), '.tools/rgbds', name), args, { cwd: tmp, stdio: 'pipe' });
    tool('rgbasm', '-o', 'b.o', 'main.asm');
    tool('rgblink', '-o', 'b.gb', 'b.o');
    tool('rgbfix', '-v', '-p', '0xFF', '-t', 'TEST', '-m', 'ROM_ONLY', '-r', '0', 'b.gb');

    const result = await runPipeline(tools, [{ path: 'main.asm', content: source }, { path: 'hardware.inc', content: include }], settings);
    expect(result.success).toBe(true);
    expect(Buffer.from(result.rom ?? []).equals(readFileSync(join(tmp, 'b.gb')))).toBe(true);
  });

  it('delivers ROM, symbols and map, with a valid header (FR-003, FR-006)', async () => {
    const result = await runPipeline(tools, [text('main.asm', ENTRY_POINT)], settings);
    expect(result.symbols).toContain('loop');
    expect(result.map).toContain('ROM0');
    const rom = result.rom ?? new Uint8Array();
    await expect(logoMatches(rom)).resolves.toBe(true);
    expect(rom[0x14d]).toBe(computeHeaderChecksum(rom));
  });

  it('handles several files, subdirectories and INCBIN', async () => {
    const result = await runPipeline(
      tools,
      [
        text('main.asm', `INCLUDE "lib/a.inc"\n${ENTRY_POINT}SECTION "d",ROM0\nINCBIN "data/b.bin"\n`),
        text('lib/a.inc', 'DEF VALUE EQU 1\n'),
        { path: 'data/b.bin', content: new Uint8Array([0xde, 0xad, 0xbe, 0xef]) },
      ],
      settings,
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.success).toBe(true);
    expect(Buffer.from(result.rom ?? []).includes(Buffer.from([0xde, 0xad, 0xbe, 0xef]))).toBe(true);
  });

  it('reports a source error with file and line, without a ROM and without rejecting', async () => {
    const result = await runPipeline(tools, [text('main.asm', 'INCLUDE "b.inc"\n'), text('b.inc', 'SECTION "a",ROM0\n\n ld a,\n')], settings);
    expect(result.success).toBe(false);
    expect(result.rom).toBeUndefined();
    expect(result.diagnostics).toMatchObject([{ file: 'b.inc', line: 3, severity: 'error', tool: 'rgbasm' }]);
  });

  it('stops at the linker and points to the source', async () => {
    const result = await runPipeline(tools, [text('main.asm', 'SECTION "a",ROM0\n nop\n jp nowhere\n')], settings);
    expect(result.success).toBe(false);
    expect(result.diagnostics).toMatchObject([{ file: 'main.asm', line: 3, tool: 'rgblink' }]);
  });

  it('reports a bad setting from rgbfix', async () => {
    const result = await runPipeline(tools, [text('main.asm', ENTRY_POINT)], { ...settings, mbc: 'BOGUS' });
    expect(result.success).toBe(false);
    expect(result.diagnostics).toMatchObject([{ file: null, tool: 'rgbfix', severity: 'error' }]);
  });
});

describe('settings the app offers', () => {
  it.each(MBC_OPTIONS)('rgbfix accepts the cartridge type %s', async (mbc) => {
    const result = await runPipeline(tools, [text('main.asm', ENTRY_POINT)], { ...settings, mbc });
    expect(result.success).toBe(true);
  });

  it.each(RAM_SIZE_OPTIONS)('writes the RAM code %o into $0149', async ({ code }) => {
    const result = await runPipeline(tools, [text('main.asm', ENTRY_POINT)], { ...settings, mbc: 'MBC5+RAM', ramSize: code });
    expect(result.rom?.[0x149]).toBe(code);
  });
});
