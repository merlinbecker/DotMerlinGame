// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSameBoyEmulator } from '../../src/adapters/emulator/sameboy/sameboy-emulator.ts';
import { testRom, W_RESULT } from '../support/roms.ts';

const DIRECT = { bootMode: 'direct-start', hardwareChecks: false } as const;

describe('battery-backed cartridge RAM (FR-026)', () => {
  it('saves the counter and restores it on the next start', async () => {
    const first = await createSameBoyEmulator();
    await first.loadRom(testRom('mbc5-battery'), DIRECT);
    first.run();
    first.advance(5);
    const counter = first.peek(W_RESULT);
    expect(first.batteryRamDirty).toBe(true);
    const save = first.readBatteryRam();
    expect(save?.length).toBe(8 * 1024);
    expect(first.batteryRamDirty).toBe(false);

    const second = await createSameBoyEmulator();
    await second.loadRom(testRom('mbc5-battery'), DIRECT);
    if (save) second.writeBatteryRam(save);
    second.run();
    second.advance(5);
    expect(second.peek(W_RESULT)).toBe((counter + 1) & 0xff);
  });

  it('has no save game for a cartridge without battery', async () => {
    const emulator = await createSameBoyEmulator();
    await emulator.loadRom(testRom('marker'), DIRECT);
    expect(emulator.readBatteryRam()).toBeNull();
  });
});
