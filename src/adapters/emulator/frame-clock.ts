/**
 * DMG frame rate: 4.194304 MHz master clock (Pan Docs "Specifications") / 154 lines × 456 dots
 * = 70224 dots per frame (Pan Docs "Rendering").
 */
export const DMG_FRAME_RATE = 4_194_304 / 70_224;
const MAX_CATCH_UP = 3;

export interface FrameClockOptions {
  readonly now: () => number;
  readonly schedule: (callback: (time: number) => void) => number;
  readonly cancel: (handle: number) => void;
  /** Called with the number of frames to emulate now (≥ 1). */
  readonly onFrames: (frames: number) => void;
  /** Optional correction in frames (e.g. from the audio buffer fill level, research.md R8). */
  readonly pacing?: () => number;
}

export interface FrameClock {
  start(): void;
  stop(): void;
  readonly running: boolean;
}

/** Drives the emulator from requestAnimationFrame by elapsed time, with bounded catch-up. */
export function createFrameClock(options: FrameClockOptions): FrameClock {
  let handle: number | null = null;
  let last = 0;
  let carry = 0;

  const tick = (time: number) => {
    handle = options.schedule(tick);
    carry += ((time - last) / 1000) * DMG_FRAME_RATE;
    last = time;
    let frames = Math.floor(carry);
    carry -= frames;
    frames += options.pacing?.() ?? 0;
    if (frames > MAX_CATCH_UP) {
      frames = MAX_CATCH_UP;
      carry = 0;
    }
    if (frames > 0) options.onFrames(frames);
  };

  return {
    start() {
      if (handle !== null) return;
      last = options.now();
      carry = 0;
      handle = options.schedule(tick);
    },
    stop() {
      if (handle !== null) options.cancel(handle);
      handle = null;
    },
    get running() {
      return handle !== null;
    },
  };
}

/** Browser defaults for createFrameClock. */
export function browserClock(onFrames: (frames: number) => void, pacing?: () => number): FrameClock {
  return createFrameClock({
    now: () => performance.now(),
    schedule: (callback) => requestAnimationFrame(callback),
    cancel: (h) => {
      cancelAnimationFrame(h);
    },
    onFrames,
    ...(pacing ? { pacing } : {}),
  });
}
