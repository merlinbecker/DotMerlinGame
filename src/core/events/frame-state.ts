import type { Unsubscribe } from '../types.ts';

/** 8-bit and 16-bit CPU registers of the DMG-01. */
export interface Registers {
  /** 8-bit: 0–0xFF */
  readonly a: number;
  readonly f: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly h: number;
  readonly l: number;
  /** 16-bit: 0–0xFFFF */
  readonly sp: number;
  readonly pc: number;
}

/** CPU flags; always consistent with `Registers.f`. */
export interface Flags {
  readonly z: boolean;
  readonly n: boolean;
  readonly h: boolean;
  readonly c: boolean;
}

/** Memory written during the frame. Ranges never overlap; `start + bytes.length <= 0x10000`. */
export interface MemoryRange {
  readonly start: number;
  readonly bytes: Uint8Array;
}

/** Immutable emulator state after one frame (channel 1, high frequency). */
export interface FrameSnapshot {
  /** Integer >= 0, strictly increasing within one run. */
  readonly frame: number;
  /** Total cycles since reset, integer >= 0. */
  readonly cycles: number;
  readonly registers: Registers;
  readonly flags: Flags;
  readonly changedMemory: readonly MemoryRange[];
  /** 160×144 bytes, row-major, values 0–3 (DMG shade, 0 = lightest). A copy, never shared with the core. */
  readonly screen: Uint8Array;
}

/**
 * How often snapshots reach subscribers. Emulation speed does not depend on it; it is the basis
 * of the E-Ink mode. `reduced` requires `everyNthFrame >= 2`.
 */
export type PublishRate =
  | { readonly kind: 'full' }
  | { readonly kind: 'reduced'; readonly everyNthFrame: number }
  | { readonly kind: 'on-demand' };

/** Read-only view of the frame state; signature matches React's useSyncExternalStore. */
export interface FrameStateSource {
  subscribe(onChange: () => void): Unsubscribe;
  getSnapshot(): FrameSnapshot | null;
}

/** Frame state as owned by the emulator service. */
export interface FrameStatePublisher extends FrameStateSource {
  setPublishRate(rate: PublishRate): void;
  getPublishRate(): PublishRate;
  /** With `on-demand`: publish exactly one current snapshot. */
  requestSnapshot(): void;
}
