// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DMG_BOOT_ROM } from '../../src/adapters/emulator/bootrom/generated/dmg-boot.ts';
import { atHandoff } from '../support/emulator.ts';
import { testRom } from '../support/roms.ts';
import { DMG_CPU, DMG_IO, dmgFlags } from './pan-docs-dmg.ts';

const hex = (n: number) => `$${n.toString(16).toUpperCase().padStart(2, '0')}`;

describe.each(['own-boot-rom', 'direct-start'] as const)('state at $0100 (%s) matches Pan Docs, column DMG (SC-001)', (bootMode) => {
  it.each(['boot-regs', 'boot-regs-cs00'])('CPU registers for %s', async (name) => {
    const emulator = await atHandoff(name, bootMode);
    const checksum = testRom(name)[0x014d] ?? 0;
    expect(emulator.cpuRegisters()).toEqual({ ...DMG_CPU, f: dmgFlags(checksum) });
  });

  it('header checksum $00 really clears H and C (test ROM sanity)', () => {
    expect(testRom('boot-regs-cs00')[0x014d]).toBe(0);
    expect(testRom('boot-regs')[0x014d]).not.toBe(0);
  });

  it.each(DMG_IO)('%s ($%s) reads the Pan Docs value', async (_name, address, value) => {
    const emulator = await atHandoff('boot-regs', bootMode);
    expect(hex(emulator.peek(address))).toBe(hex(value));
  });
});

describe('own boot ROM', () => {
  it('is exactly 256 bytes (Pan Docs: DMG boot ROM size)', () => {
    expect(DMG_BOOT_ROM.length).toBe(256);
  });

  it('is unmapped after the hand-off: $0000 reads the cartridge', async () => {
    const emulator = await atHandoff('boot-regs', 'own-boot-rom');
    const rom = testRom('boot-regs');
    for (let address = 0; address < 0x100; address++) expect(emulator.peek(address)).toBe(rom[address]);
  });

  it('the game sees the same registers at its entry point', async () => {
    const emulator = await atHandoff('boot-regs', 'own-boot-rom');
    emulator.run();
    emulator.advance(2);
    const stored = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => emulator.peek(0xc000 + i));
    expect(stored).toEqual([DMG_CPU.a, dmgFlags(testRom('boot-regs')[0x014d] ?? 0), DMG_CPU.b, DMG_CPU.c, DMG_CPU.d, DMG_CPU.e, DMG_CPU.h, DMG_CPU.l]);
    expect(emulator.peek(0xc008) | (emulator.peek(0xc009) << 8)).toBe(DMG_CPU.sp);
  });
});
