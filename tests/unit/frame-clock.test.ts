import { describe, expect, it, vi } from 'vitest';
import { createFrameClock, DMG_FRAME_RATE } from '../../src/adapters/emulator/frame-clock.ts';

function manualClock() {
  let now = 0;
  let pending: ((time: number) => void) | null = null;
  const onFrames = vi.fn();
  const clock = createFrameClock({
    now: () => now,
    schedule: (callback) => {
      pending = callback;
      return 1;
    },
    cancel: () => {
      pending = null;
    },
    onFrames,
  });
  const advance = (ms: number) => {
    now += ms;
    const callback = pending;
    pending = null;
    callback?.(now);
  };
  return { clock, onFrames, advance, scheduled: () => pending !== null };
}

describe('frame clock', () => {
  it('derives the DMG frame rate from Pan Docs (4.194304 MHz / 70224 dots)', () => {
    expect(DMG_FRAME_RATE).toBeCloseTo(59.7275, 3);
  });

  it('emits frames according to elapsed time', () => {
    const { clock, onFrames, advance } = manualClock();
    clock.start();
    for (let i = 0; i < 60; i++) advance(1000 / 60);
    const total = onFrames.mock.calls.reduce((sum, [n]) => sum + (n as number), 0);
    expect(total).toBeGreaterThanOrEqual(59);
    expect(total).toBeLessThanOrEqual(60);
  });

  it('catches up at most 3 frames after a long stall', () => {
    const { clock, onFrames, advance } = manualClock();
    clock.start();
    advance(16);
    onFrames.mockClear();
    advance(2000);
    expect(onFrames).toHaveBeenCalledWith(3);
  });

  it('does not jump in time after stop and start (pause, background)', () => {
    const { clock, onFrames, advance } = manualClock();
    clock.start();
    advance(17);
    clock.stop();
    advance(60_000);
    onFrames.mockClear();
    clock.start();
    advance(17);
    expect(onFrames).toHaveBeenCalledWith(1);
  });

  it('stops scheduling when stopped', () => {
    const { clock, scheduled } = manualClock();
    clock.start();
    clock.stop();
    expect(scheduled()).toBe(false);
  });
});
