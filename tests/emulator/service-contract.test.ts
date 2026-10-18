// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunState } from '../../src/core/index.ts';
import { createSameBoyEmulator } from '../../src/adapters/emulator/sameboy/sameboy-emulator.ts';
import { createEmulatorSession } from '../../src/app/session/emulator-session.ts';
import { memoryRomStore } from '../support/fakes.ts';
import { DONE, testRom, W_DONE } from '../support/roms.ts';

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v), removeItem: (k: string) => data.delete(k) });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

async function emulatorWith(name: string) {
  const emulator = await createSameBoyEmulator({ clock: null });
  await emulator.loadRom(testRom(name), { bootMode: 'direct-start', hardwareChecks: false });
  emulator.run();
  return emulator;
}

describe('emulator as a headless service (US3)', () => {
  it('publishes registers, flags, cycles and changed memory of the current frame (US3-AS1)', async () => {
    const emulator = await emulatorWith('marker');
    const frames: number[] = [];
    let changed = 0;
    emulator.frameState.subscribe(() => {
      const s = emulator.frameState.getSnapshot();
      if (s) frames.push(s.frame);
      changed += s?.changedMemory.length ?? 0;
    });
    emulator.advance(3);
    const s = emulator.frameState.getSnapshot();
    expect(frames).toEqual([1, 2, 3]);
    expect(s?.registers.pc).toBeGreaterThanOrEqual(0x0150);
    expect(s?.cycles).toBeGreaterThan(0);
    expect(changed).toBeGreaterThan(0); // the marker ROM writes wDone in its first frame
  });

  it.each([
    [{ kind: 'reduced', everyNthFrame: 4 } as const, 15],
    [{ kind: 'on-demand' } as const, 0],
  ])('a slower publish rate (%o) does not slow down the emulation (US3-AS3)', async (rate, expectedDeliveries) => {
    const fast = await emulatorWith('pattern');
    const slow = await emulatorWith('pattern');
    let delivered = 0;
    fast.frameState.subscribe(() => undefined);
    slow.frameState.setPublishRate(rate);
    slow.frameState.subscribe(() => {
      delivered++;
    });
    fast.advance(60);
    slow.advance(60);
    expect(delivered).toBe(expectedDeliveries);
    expect(slow.cpuRegisters()).toEqual(fast.cpuRegisters());
    expect(slow.peek(W_DONE)).toBe(DONE);
  });

  it('pauses, resumes and resets through the action channel (US3-AS4)', async () => {
    const emulator = await createSameBoyEmulator({ clock: null });
    const session = createEmulatorSession({ emulator, romStore: memoryRomStore() });
    const states: RunState[] = [];
    session.events.subscribe('RunStateChanged', (event) => states.push(event.runState));
    session.dispatch({ type: 'LoadRom', bytes: testRom('marker'), fileName: 'm.gb' });
    await session.idle();
    emulator.advance(5);
    session.dispatch({ type: 'Pause' });
    await session.idle();
    expect(emulator.running).toBe(false);
    session.dispatch({ type: 'Resume' });
    await session.idle();
    expect(emulator.running).toBe(true);
    session.dispatch({ type: 'Reset' });
    await session.idle();
    expect(emulator.peek(W_DONE)).not.toBe(DONE); // fresh start, the ROM has not run yet
    emulator.advance(120); // default start mode runs the own boot ROM first
    expect(emulator.peek(W_DONE)).toBe(DONE);
    expect(states).toEqual(['running', 'paused', 'running']);
  });
});
