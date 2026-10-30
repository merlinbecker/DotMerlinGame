import { describe, expect, it } from 'vitest';
import { decodeSource, generateSource } from '../../src/core/index.ts';

function rom(body: readonly number[], size = 0x8000) {
  const bytes = new Uint8Array(size);
  bytes.set([0x00, 0xc3, 0x50, 0x01], 0x100);
  bytes.set(new TextEncoder().encode('GAME'), 0x134);
  bytes.set(body, 0x150);
  return bytes;
}

async function source(r: Uint8Array, file = 'bank_000.asm') {
  const generated = await generateSource(r, 'my game.gb');
  const found = generated.files.find((f) => f.path === file);
  return { generated, text: found ? (decodeSource(found) ?? '') : '' };
}

describe('generated source', () => {
  it('names the project and takes the title from the header', async () => {
    const { generated } = await source(rom([]));
    expect(generated.name).toBe('my game');
    expect(generated.settings).toEqual({ entry: 'main.asm', title: 'GAME', mbc: 'ROM_ONLY', ramSize: 0, fixHeader: false });
  });

  it('has one file per bank, included by main.asm (FR-007)', async () => {
    const { generated } = await source(rom([], 0x10000));
    expect(generated.files.map((f) => f.path)).toEqual(['main.asm', 'bank_000.asm', 'bank_001.asm', 'bank_002.asm', 'bank_003.asm']);
    const main = decodeSource(generated.files[0] ?? { path: '', content: new Uint8Array() }) ?? '';
    expect(main).toContain('INCLUDE "bank_003.asm"');
    const bank = (await source(rom([], 0x10000), 'bank_002.asm')).text;
    expect(bank).toContain('SECTION "Bank 2", ROMX[$4000], BANK[2]');
  });

  it('comments the header (FR-006)', async () => {
    const { text } = await source(rom([]));
    for (const name of ['Entry point', 'Nintendo logo', 'Title', 'Cartridge type', 'Header checksum', 'Global checksum']) expect(text).toContain(`; ${name}`);
  });

  it('gives targets a label and uses it (FR-004)', async () => {
    const { text } = await source(rom([0x18, 0xfe]));
    expect(text).toContain('L000_0150:');
    expect(text).toContain('jp L000_0150');
    expect(text).toContain('jr L000_0150');
  });

  it('keeps the number for a target inside an instruction and in RAM', async () => {
    const { text } = await source(rom([0x3e, 0xc9, 0xc3, 0x51, 0x01]));
    expect(text).toContain('jp $0151');
    expect((await source(rom([0xcd, 0x00, 0xc0, 0xc9]))).text).toContain('call $C000');
  });

  it('writes data as db and long runs as ds (FR-003)', async () => {
    const r = rom([0xc9]);
    r.set([1, 2, 3], 0x200);
    const { text } = await source(r);
    expect(text).toContain('db $01, $02, $03');
    expect(text).toMatch(/ds \d+, \$00/);
  });

  it('notes a size that is no multiple of 16 KiB', async () => {
    const { generated } = await source(rom([], 0x5000));
    expect(decodeSource(generated.files[0] ?? { path: '', content: new Uint8Array() })).toContain('adds 12288 bytes');
  });
});
