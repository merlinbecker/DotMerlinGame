import type { DomainEventSubscriber } from '../events/domain-events.ts';
import type { FrameStatePublisher } from '../events/frame-state.ts';
import type { RomRejectReason } from '../rom/header.ts';
import type { Button } from '../types.ts';
import type { AudioSink } from './audio-output.ts';

export type BootMode = 'own-boot-rom' | 'direct-start';

export interface LoadRomOptions {
  readonly bootMode: BootMode;
  /** Check header logo and checksum like the original boot ROM ("hardware-near" mode). */
  readonly hardwareChecks: boolean;
}

/** Thrown by loadRom; the previously loaded ROM and its state stay untouched. */
export class RomLoadError extends Error {
  readonly reason: RomRejectReason;

  constructor(reason: RomRejectReason) {
    super(`ROM rejected: ${reason}`);
    this.name = 'RomLoadError';
    this.reason = reason;
  }
}

/**
 * Headless emulator service (Constitution II). Breakpoints and step are declared for M4 and throw in
 * M1 (contracts/ports.md).
 */
export interface EmulatorPort {
  loadRom(rom: Uint8Array, options: LoadRomOptions): Promise<void>;
  run(): void;
  pause(): void;
  reset(): void;
  step(): void;
  setButton(button: Button, pressed: boolean): void;
  setBreakpoint(address: number, bank?: number): void;
  clearBreakpoint(address: number, bank?: number): void;
  /** Battery-backed cartridge RAM; null if the cartridge has none. */
  readBatteryRam(): Uint8Array | null;
  /** Call after loadRom() and before run(); ignored if the cartridge has no battery. */
  writeBatteryRam(data: Uint8Array): void;
  /** True if cartridge RAM was written since the last readBatteryRam(). */
  readonly batteryRamDirty: boolean;
  /** Samples go to this sink; null detaches audio, emulation continues. */
  setAudioSink(sink: AudioSink | null): void;
  readonly frameState: FrameStatePublisher;
  readonly events: DomainEventSubscriber;
}
