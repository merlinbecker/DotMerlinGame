import type { PublishRate } from '../events/frame-state.ts';
import type { BootMode } from '../ports/emulator.ts';
import type { Button } from '../types.ts';

/** Everything a view may ask for; the only way a view changes state. */
export type ViewAction =
  | { readonly type: 'Pause' }
  | { readonly type: 'Resume' }
  | { readonly type: 'Reset' }
  | { readonly type: 'SetBreakpoint'; readonly address: number; readonly bank?: number }
  | { readonly type: 'ClearBreakpoint'; readonly address: number; readonly bank?: number }
  | { readonly type: 'ButtonDown'; readonly button: Button }
  | { readonly type: 'ButtonUp'; readonly button: Button }
  | { readonly type: 'LoadRom'; readonly bytes: Uint8Array; readonly fileName: string }
  | { readonly type: 'StartStoredRom' }
  | { readonly type: 'SetBootMode'; readonly bootMode: BootMode }
  | { readonly type: 'SetHardwareChecks'; readonly enabled: boolean }
  | { readonly type: 'SetVolume'; readonly volume: number }
  | { readonly type: 'SetMuted'; readonly muted: boolean }
  | { readonly type: 'UnlockAudio' }
  /** Handled per slot by the app, never by the emulator (FR-022). */
  | { readonly type: 'SetFrameRate'; readonly rate: PublishRate };
