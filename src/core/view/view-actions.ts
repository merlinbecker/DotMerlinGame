import type { PublishRate } from '../events/frame-state.ts';
import type { BootMode } from '../ports/emulator.ts';
import type { ProjectSettings } from '../project/model.ts';
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
  | { readonly type: 'SetFrameRate'; readonly rate: PublishRate }
  /** One current snapshot for this slot only; handled by the app, never by the emulator (M1b). */
  | { readonly type: 'RequestSnapshot' }
  // Project actions of M2, handled by the project session.
  | { readonly type: 'NewProjectFromExample'; readonly exampleId: string }
  | { readonly type: 'OpenProject'; readonly projectId: string }
  | { readonly type: 'DeleteProject'; readonly projectId: string }
  | { readonly type: 'OpenFile'; readonly path: string }
  | { readonly type: 'EditFile'; readonly path: string; readonly text: string }
  | { readonly type: 'CreateFile'; readonly path: string }
  | { readonly type: 'RenameFile'; readonly from: string; readonly to: string }
  | { readonly type: 'DeleteFile'; readonly path: string }
  | { readonly type: 'RenameProject'; readonly name: string }
  | { readonly type: 'SetProjectSettings'; readonly settings: ProjectSettings }
  | { readonly type: 'ImportRom'; readonly bytes: Uint8Array; readonly fileName: string }
  | { readonly type: 'Build' }
  | { readonly type: 'RunBuild' }
  | { readonly type: 'ExportRom' }
  | { readonly type: 'ExportZip' }
  | { readonly type: 'ImportZip'; readonly bytes: Uint8Array }
  | { readonly type: 'ResolveImport'; readonly choice: 'replace' | 'copy' | 'cancel' }
  | { readonly type: 'GoToDiagnostic'; readonly file: string; readonly line: number };
