// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { RomLoadError, type FrameSnapshot } from '../../src/core/index.ts';
import { createSameBoyEmulator } from '../../src/adapters/emulator/sameboy/sameboy-emulator.ts';
import { DONE, testRom, W_DONE } from '../support/roms.ts';

const DIRECT = { bootMode: 'direct-start', hardwareChecks: false } as const;

async function started(name: string) {
  const emulator = await createSameBoyEmulator();
  await emulator.loadRom(testRom(name), DIRECT);
  emulator.run();
  return emulator;
}

describe('SameBoy adapter (EmulatorPort)', () => {
  it('publishes snapshots with a 160x144 screen of shades 0-3', async () => {
    const emulator = await started('pattern');
    let last: FrameSnapshot | null = null;
    emulator.frameState.subscribe(() => {
      last = emulator.frameState.getSnapshot();
    });
    emulator.advance(30);
    const snapshot = last as FrameSnapshot | null;
    expect(snapshot?.frame).toBe(30);
    expect(snapshot?.screen.length).toBe(160 * 144);
    expect([...new Set(snapshot?.screen)].every((shade) => shade >= 0 && shade <= 3)).toBe(true);
    expect(new Set(snapshot?.screen).size).toBeGreaterThan(1);
    expect(emulator.peek(W_DONE)).toBe(DONE);
  });

  it('keeps flags consistent with F and reports increasing cycles', async () => {
    const emulator = await started('marker');
    const snapshots: FrameSnapshot[] = [];
    emulator.frameState.subscribe(() => {
      const s = emulator.frameState.getSnapshot();
      if (s) snapshots.push(s);
    });
    emulator.advance(3);
    for (const s of snapshots) {
      expect(s.flags).toEqual({ z: (s.registers.f & 0x80) !== 0, n: (s.registers.f & 0x40) !== 0, h: (s.registers.f & 0x20) !== 0, c: (s.registers.f & 0x10) !== 0 });
    }
    expect(snapshots[1]?.cycles).toBeGreaterThan(snapshots[0]?.cycles ?? Infinity);
  });

  it('reports only memory writes at $8000 and above, accumulated across skipped frames', async () => {
    const emulator = await started('marker');
    emulator.frameState.setPublishRate({ kind: 'reduced', everyNthFrame: 5 });
    let snapshot: FrameSnapshot | null = null;
    emulator.frameState.subscribe(() => {
      snapshot = emulator.frameState.getSnapshot();
    });
    emulator.advance(5);
    const ranges = (snapshot as FrameSnapshot | null)?.changedMemory ?? [];
    expect(ranges.length).toBeGreaterThan(0);
    for (const range of ranges) expect(range.start).toBeGreaterThanOrEqual(0x8000);
    expect(ranges.some((r) => r.start <= W_DONE && r.start + r.bytes.length > W_DONE)).toBe(true);
    for (let i = 1; i < ranges.length; i++) {
      const prev = ranges[i - 1];
      if (prev) expect(ranges[i]?.start ?? 0).toBeGreaterThan(prev.start + prev.bytes.length - 1);
    }
  });

  it.each([
    ['cgb-only', 'cgb-only'],
    ['bad-cart-type', 'unsupported-cartridge'],
  ])('rejects %s with reason %s and keeps the previous ROM running', async (name, reason) => {
    const emulator = await started('marker');
    emulator.advance(2);
    const before = emulator.frameState.getSnapshot();
    await expect(emulator.loadRom(testRom(name), DIRECT)).rejects.toEqual(new RomLoadError(reason as 'cgb-only'));
    emulator.advance(2);
    expect(emulator.peek(W_DONE)).toBe(DONE);
    expect(before).toBeDefined();
  });

  it('rejects a truncated file as invalid', async () => {
    const emulator = await createSameBoyEmulator();
    await expect(emulator.loadRom(testRom('mbc1').subarray(0, 0x4000), DIRECT)).rejects.toMatchObject({ reason: 'invalid' });
  });

  it('runs a CGB-compatible ROM in DMG mode (FR-017)', async () => {
    const emulator = await started('cgb-compatible');
    emulator.advance(5);
    // Accepted and running; the core only emulates the DMG-01 model, so Color features never activate.
    expect(emulator.peek(W_DONE)).toBe(DONE);
  });

  it('does not advance while paused', async () => {
    const emulator = await started('marker');
    emulator.pause();
    emulator.advance(10);
    expect(emulator.frameState.getSnapshot()).toBeNull();
  });

  it('throws for debugger functions planned for M4', async () => {
    const emulator = await createSameBoyEmulator();
    expect(() => {
      emulator.step();
    }).toThrow(/M1/);
    expect(() => {
      emulator.setBreakpoint(0x100);
    }).toThrow(/M1/);
  });
});
