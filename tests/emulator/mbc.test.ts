// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSameBoyEmulator } from '../../src/adapters/emulator/sameboy/sameboy-emulator.ts';
import { DONE, testRom, W_DONE, W_RESULT } from '../support/roms.ts';

describe('cartridge types (FR-001)', () => {
  it.each([
    ['mbc-none', 2],
    ['mbc1', 8],
    ['mbc3', 8],
    ['mbc5', 32],
  ])('%s switches through all %i banks', async (name, banks) => {
    const emulator = await createSameBoyEmulator();
    await emulator.loadRom(testRom(name), { bootMode: 'direct-start', hardwareChecks: false });
    emulator.run();
    emulator.advance(10);
    expect(emulator.peek(W_DONE)).toBe(DONE);
    for (let bank = 1; bank < banks; bank++) expect(emulator.peek(W_RESULT + bank)).toBe(bank);
  });
});
