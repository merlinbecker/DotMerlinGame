/** Receives interleaved stereo PCM from the emulator, one call per emulated frame. */
export interface AudioSink {
  readonly sampleRate: number;
  push(samples: Int16Array): void;
}

/** Sound output of the device (contracts/ports.md); no SharedArrayBuffer, no host headers needed. */
export interface AudioOutputPort extends AudioSink {
  /** Must be called from a user gesture; resolves when the browser allows playback. */
  unlock(): Promise<void>;
  readonly unlocked: boolean;
  /** 0..1, takes effect immediately. */
  setVolume(volume: number): void;
  /** Takes effect immediately; emulation is unaffected. */
  setMuted(muted: boolean): void;
  /** Fill level of the playback buffer in sample frames; drives emulation pacing (research.md R8). */
  readonly bufferedSamples: number;
  /** Times the buffer ran empty or overflowed (diagnostics for SC-007). */
  readonly underflows: number;
  readonly overflows: number;
  /** Pause or background: short fade-out to avoid clicks. */
  suspend(): Promise<void>;
  /** Short fade-in. */
  resume(): Promise<void>;
}
