import type { DomainEventSubscriber } from '../events/domain-events.ts';
import type { FrameStatePublisher } from '../events/frame-state.ts';
import type { Button } from '../types.ts';

export type BootMode = 'own-boot-rom' | 'direct-start';

export interface LoadRomOptions {
  readonly bootMode: BootMode;
  /** Check header logo and checksum like the original boot ROM ("hardware-near" mode). */
  readonly hardwareChecks: boolean;
}

/**
 * Headless emulator service (Constitution II). First draft: the scope of debug access
 * (memory watch, write breakpoints, bank info) is an open point for M1/M4.
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
  readonly frameState: FrameStatePublisher;
  readonly events: DomainEventSubscriber;
}
