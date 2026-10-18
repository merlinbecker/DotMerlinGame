/** Length of the fade ramp in sample frames (≈ 5 ms at 48 kHz). */
export const FADE_SAMPLES = 256;

/**
 * Stereo ring buffer between the emulator (pushes Int16 frames) and the audio worklet (pulls floats).
 * Pure logic, shared by the worklet and the tests.
 */
export function createRingBuffer(capacity: number) {
  const left = new Float32Array(capacity);
  const right = new Float32Array(capacity);
  let read = 0;
  let size = 0;
  let gain = 1;
  let target = 1;
  let underflows = 0;
  let overflows = 0;

  return {
    push(samples: Int16Array) {
      const frames = samples.length / 2;
      let dropped = false;
      for (let i = 0; i < frames; i++) {
        if (size === capacity) {
          dropped = true;
          continue;
        }
        const write = (read + size) % capacity;
        left[write] = (samples[i * 2] ?? 0) / 32768;
        right[write] = (samples[i * 2 + 1] ?? 0) / 32768;
        size++;
      }
      if (dropped) overflows++;
    },
    pull(outLeft: Float32Array, outRight: Float32Array) {
      let short = false;
      const step = 1 / FADE_SAMPLES;
      for (let i = 0; i < outLeft.length; i++) {
        if (gain < target) gain = Math.min(target, gain + step);
        else if (gain > target) gain = Math.max(target, gain - step);
        if (size === 0) {
          short = true;
          outLeft[i] = 0;
          outRight[i] = 0;
          continue;
        }
        outLeft[i] = (left[read] ?? 0) * gain;
        outRight[i] = (right[read] ?? 0) * gain;
        read = (read + 1) % capacity;
        size--;
      }
      if (short) underflows++;
    },
    /** 0 = fade out, 1 = fade in. */
    fade(next: 0 | 1) {
      target = next;
    },
    clear() {
      read = 0;
      size = 0;
    },
    get buffered() {
      return size;
    },
    get underflows() {
      return underflows;
    },
    get overflows() {
      return overflows;
    },
  };
}
