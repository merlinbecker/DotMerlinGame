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

/**
 * Cartridge RAM as the core holds it (research.md R11): all banks of 8 KiB back to back. MBC2 has 512 bytes
 * whose low nibble is the stored value (Core/mbc.c:212, memory.c:456). MBC3 clock registers are not RAM
 * and not included.
 */
export interface CartRamSnapshot {
  readonly bytes: Uint8Array;
  /** At least 1; banks of 8 KiB, the last one may be shorter (MBC2). */
  readonly bankCount: number;
  /** Bank currently selected for $A000–$BFFF, clamped to bankCount - 1. */
  readonly bank: number;
  /** false = locked by the game; null = cartridge without a lock (no MBC). */
  readonly enabled: boolean | null;
}

/**
 * Frame-consistent, read-only view into memory for the memory views (M1b, contracts/frame-state.md). All
 * arrays are copies taken without side effects on the emulation; `rom` is one copy per loaded ROM.
 */
export interface InspectionSnapshot {
  /** The loaded ROM; the same reference in every snapshot of this ROM. Never modify. */
  readonly rom: Uint8Array;
  /** ROM bank mapped at $4000–$7FFF. */
  readonly romBank: number;
  /** ROM bank mapped at $0000–$3FFF (not 0 only for special MBC1 wiring). */
  readonly rom0Bank: number;
  /** $8000–$9FFF, inner state (also while the LCD blocks CPU access). */
  readonly vram: Uint8Array;
  /** $C000–$DFFF */
  readonly wram: Uint8Array;
  /** $FE00–$FE9F, inner state. */
  readonly oam: Uint8Array;
  /** $FF00–$FF7F raw values; DIV from the internal divider (research.md R3). */
  readonly io: Uint8Array;
  /** $FF80–$FFFE */
  readonly hram: Uint8Array;
  /** $FFFF */
  readonly ie: number;
  readonly cartRam: CartRamSnapshot | null;
  readonly cpu: { readonly ime: boolean; readonly halted: boolean };
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
  /** null unless a visible slot asked for inspection data (setInspectionDemand). */
  readonly inspection: InspectionSnapshot | null;
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
  /**
   * Publish one current snapshot, also with `on-demand`. Requests in the same task are coalesced into one
   * build in a microtask; a frame delivered before that satisfies them.
   */
  requestSnapshot(): void;
  /** true: snapshots built from now on include `inspection`. Set by the app from the visible slots. */
  setInspectionDemand(active: boolean): void;
  /** Kind of the running notification; only valid inside a subscriber callback. For the app's slot sources. */
  getDeliveryKind(): DeliveryKind;
}

export type DeliveryKind = 'frame' | 'request';
