import { describe, expect, it } from 'vitest';
import { createRingBuffer, FADE_SAMPLES } from '../../src/adapters/audio/ring-buffer.ts';

const stereo = (...frames: [number, number][]) => new Int16Array(frames.flat());

describe('audio ring buffer', () => {
  it('returns pushed stereo samples as floats in order', () => {
    const ring = createRingBuffer(8);
    ring.push(stereo([16384, -16384], [32767, 0]));
    const left = new Float32Array(2);
    const right = new Float32Array(2);
    ring.pull(left, right);
    expect([...left]).toEqual([0.5, 32767 / 32768]);
    expect([...right]).toEqual([-0.5, 0]);
    expect(ring.buffered).toBe(0);
  });

  it('fills an underflow with silence and counts it', () => {
    const ring = createRingBuffer(8);
    ring.push(stereo([16384, 16384]));
    const left = new Float32Array(3);
    const right = new Float32Array(3);
    ring.pull(left, right);
    expect([...left]).toEqual([0.5, 0, 0]);
    expect(ring.underflows).toBe(1);
  });

  it('drops samples on overflow and counts it', () => {
    const ring = createRingBuffer(2);
    ring.push(stereo([1, 1], [2, 2], [3, 3]));
    expect(ring.buffered).toBe(2);
    expect(ring.overflows).toBe(1);
  });

  it('ramps out and in instead of cutting (no clicks, FR-020)', () => {
    const ring = createRingBuffer(FADE_SAMPLES * 4);
    ring.push(new Int16Array(FADE_SAMPLES * 4).fill(16384));
    ring.fade(0);
    const left = new Float32Array(FADE_SAMPLES);
    const right = new Float32Array(FADE_SAMPLES);
    ring.pull(left, right);
    expect(left[0]).toBeGreaterThan(0.4);
    expect(left[FADE_SAMPLES - 1]).toBeLessThan(0.01);
    for (let i = 1; i < FADE_SAMPLES; i++) expect(left[i] ?? 0).toBeLessThanOrEqual(left[i - 1] ?? 0);
    ring.fade(1);
    ring.pull(left, right);
    expect(left[0]).toBeLessThan(0.01);
    expect(left[FADE_SAMPLES - 1]).toBeGreaterThan(0.49);
  });
});
