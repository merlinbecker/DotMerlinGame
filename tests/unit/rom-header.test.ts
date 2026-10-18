// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeHeaderChecksum, parseHeader, validateForLoad } from '../../src/core/rom/header.ts';

const rom = (name: string) => new Uint8Array(readFileSync(`tests/roms/build/${name}.gb`));

describe('parseHeader (Pan Docs "The Cartridge Header")', () => {
  it('reads title, type and sizes of a plain 32 KiB ROM', async () => {
    const info = await parseHeader(rom('marker'));
    expect(info.title).toBe('MARKER');
    expect(info.cartridgeType).toEqual({ code: 0x00, mbc: 'none', ram: false, battery: false });
    expect(info.romSizeBytes).toBe(32 * 1024);
    expect(info.romBanks).toBe(2);
    expect(info.ramSizeBytes).toBe(0);
    expect(info.cgbFlag).toBe('dmg');
    expect(info.headerChecksumValid).toBe(true);
    expect(info.logoValid).toBe(true);
  });

  it.each([
    ['mbc1', { code: 0x01, mbc: 'mbc1', ram: false, battery: false }, 8],
    ['mbc3', { code: 0x11, mbc: 'mbc3', ram: false, battery: false }, 8],
    ['mbc5', { code: 0x19, mbc: 'mbc5', ram: false, battery: false }, 32],
  ])('reads the cartridge type and bank count of %s', async (name, type, banks) => {
    const info = await parseHeader(rom(name));
    expect(info.cartridgeType).toEqual(type);
    expect(info.romBanks).toBe(banks);
    expect(info.romSizeBytes).toBe(banks * 16 * 1024);
  });

  it('reads RAM size and battery of an MBC5+RAM+BATTERY cartridge', async () => {
    const info = await parseHeader(rom('mbc5-battery'));
    expect(info.cartridgeType).toEqual({ code: 0x1b, mbc: 'mbc5', ram: true, battery: true });
    expect(info.ramSizeBytes).toBe(8 * 1024);
  });

  it.each([
    ['cgb-only', 'cgb-only'],
    ['cgb-compatible', 'cgb-compatible'],
  ])('reads the CGB flag of %s', async (name, flag) => {
    expect((await parseHeader(rom(name))).cgbFlag).toBe(flag);
  });

  it('detects a broken logo and a broken header checksum', async () => {
    expect((await parseHeader(rom('bad-logo'))).logoValid).toBe(false);
    expect((await parseHeader(rom('bad-checksum'))).headerChecksumValid).toBe(false);
  });

  it('computes the header checksum like the boot ROM', () => {
    const bytes = rom('marker');
    expect(computeHeaderChecksum(bytes)).toBe(bytes[0x014d]);
    expect(computeHeaderChecksum(rom('boot-regs-cs00'))).toBe(0);
  });
});

describe('validateForLoad (data-model.md)', () => {
  it('accepts the supported test ROMs', async () => {
    for (const name of ['marker', 'mbc-none', 'mbc1', 'mbc3', 'mbc5', 'mbc5-battery', 'cgb-compatible']) {
      expect(await validateForLoad(rom(name))).toEqual({ ok: true, info: await parseHeader(rom(name)) });
    }
  });

  it('rejects a file that is too small for a header', async () => {
    expect(await validateForLoad(new Uint8Array(0x100))).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects a ROM whose size does not match the header', async () => {
    expect(await validateForLoad(rom('mbc1').subarray(0, 0x8000))).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects a CGB-only ROM', async () => {
    expect(await validateForLoad(rom('cgb-only'))).toEqual({ ok: false, reason: 'cgb-only' });
  });

  it('rejects a cartridge type that Pan Docs does not define', async () => {
    expect(await validateForLoad(rom('bad-cart-type'))).toEqual({ ok: false, reason: 'unsupported-cartridge' });
  });

  it('accepts a defined but unassured cartridge type such as MBC2', async () => {
    const bytes = rom('marker');
    bytes[0x0147] = 0x05;
    bytes[0x014d] = computeHeaderChecksum(bytes);
    const result = await validateForLoad(bytes);
    expect(result.ok && result.info.cartridgeType.mbc).toBe('other');
  });
});
