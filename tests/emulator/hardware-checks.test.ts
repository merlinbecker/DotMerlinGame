// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { BootMode, HaltReason } from '../../src/core/index.ts';
import { createSameBoyEmulator } from '../../src/adapters/emulator/sameboy/sameboy-emulator.ts';
import { DONE, testRom, W_DONE } from '../support/roms.ts';

const MODES: BootMode[] = ['own-boot-rom', 'direct-start'];

async function start(name: string, bootMode: BootMode, hardwareChecks: boolean) {
  const emulator = await createSameBoyEmulator({ clock: null });
  const halts: HaltReason[] = [];
  emulator.events.subscribe('EmulatorHalted', (event) => halts.push(event.reason));
  await emulator.loadRom(testRom(name), { bootMode, hardwareChecks });
  emulator.run();
  emulator.advance(200);
  return { emulator, halts };
}

describe.each(MODES)('hardware-near mode (%s, FR-011)', (bootMode) => {
  it.each([
    ['bad-logo', 'header-logo'],
    ['bad-checksum', 'header-checksum'],
  ] as const)('stops %s before the first instruction at $0100 (%s)', async (name, reason) => {
    const { emulator, halts } = await start(name, bootMode, true);
    expect(halts).toEqual([reason]);
    expect(emulator.running).toBe(false);
    expect(emulator.cpuRegisters().pc).toBe(0x0100);
    expect(emulator.peek(W_DONE)).not.toBe(DONE);
    emulator.run();
    emulator.advance(10);
    expect(emulator.peek(W_DONE)).not.toBe(DONE);
  });

  it.each(['bad-logo', 'bad-checksum'])('runs %s anyway without hardware-near mode', async (name) => {
    const { emulator, halts } = await start(name, bootMode, false);
    expect(halts).toEqual([]);
    expect(emulator.peek(W_DONE)).toBe(DONE);
  });

  it('never stops a valid ROM', async () => {
    const { emulator, halts } = await start('marker', bootMode, true);
    expect(halts).toEqual([]);
    expect(emulator.peek(W_DONE)).toBe(DONE);
  });
});
