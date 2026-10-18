import { describe, expect, it } from 'vitest';
import { bufferPacing, createFrameClock, DMG_FRAME_RATE } from '../../src/adapters/emulator/frame-clock.ts';

const RATE = 48000;
const PER_FRAME = RATE / DMG_FRAME_RATE;

describe('audio-driven pacing (research.md R8, SC-007)', () => {
  it('adds a frame when the buffer runs low and drops one when it runs high', () => {
    const target = RATE * 0.08;
    expect(bufferPacing(target - 2 * PER_FRAME, RATE)).toBe(1);
    expect(bufferPacing(target, RATE)).toBe(0);
    expect(bufferPacing(target + 3 * PER_FRAME, RATE)).toBe(-1);
  });

  it.each([0.995, 1, 1.005])('keeps the buffer in range for 10 minutes with an audio clock off by factor %s', (audioClock) => {
    let now = 0;
    let buffered = 0;
    let pending: ((t: number) => void) | null = null;
    let min = Infinity;
    let max = 0;
    const clock = createFrameClock({
      now: () => now,
      schedule: (callback) => {
        pending = callback;
        return 1;
      },
      cancel: () => undefined,
      onFrames: (frames) => {
        buffered += frames * PER_FRAME;
      },
      pacing: () => bufferPacing(buffered, RATE),
    });
    clock.start();
    const tick = 1000 / 60;
    for (let i = 0; i < 60 * 600; i++) {
      now += tick;
      buffered = Math.max(0, buffered - (tick / 1000) * RATE * audioClock);
      const callback = pending as ((t: number) => void) | null;
      pending = null;
      callback?.(now);
      if (i > 120) {
        min = Math.min(min, buffered);
        max = Math.max(max, buffered);
      }
    }
    expect(min).toBeGreaterThan(0);
    expect(max).toBeLessThan(RATE * 0.25);
  });
});
