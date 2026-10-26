import type { DomainEventSubscriber, HaltReason, RunState } from '../events/domain-events.ts';
import type { FrameStateSource } from '../events/frame-state.ts';
import type { JsonValue, Unsubscribe } from '../types.ts';
import type { BootMode } from '../ports/emulator.ts';
import type { RomHeaderInfo, RomRejectReason } from '../rom/header.ts';
import type { ViewAction } from './view-actions.ts';

export type ViewTypeId = string;
export type IconId = string;

export interface ViewSize {
  readonly width: number;
  readonly height: number;
}

export interface ProjectInfo {
  readonly id: string;
  readonly name: string;
}

/** Read-only access to the open project; `null` if none is open. */
export interface ProjectStateSource {
  subscribe(onChange: () => void): Unsubscribe;
  getSnapshot(): ProjectInfo | null;
}

/** A hint the session shows until the next ROM start or until it is resolved. */
export type Notice =
  | { readonly kind: 'header-invalid' }
  | { readonly kind: 'halted'; readonly reason: HaltReason }
  | { readonly kind: 'rejected'; readonly reason: RomRejectReason }
  | { readonly kind: 'storage-full' }
  | { readonly kind: 'audio-locked' };

/** Read-only emulator session state for views (contracts/view-contract.md). */
export interface SessionState {
  readonly runState: RunState;
  readonly rom: RomHeaderInfo | null;
  readonly fileName: string | null;
  /** A ROM is stored locally and can be started without a file picker. */
  readonly storedRomAvailable: boolean;
  readonly settings: { readonly bootMode: BootMode; readonly hardwareChecks: boolean };
  readonly audio: { readonly muted: boolean; readonly volume: number; readonly unlocked: boolean };
  readonly notice: Notice | null;
  /** Measured on the device for SC-003 and SC-007; null until measured. */
  readonly diagnostics: Diagnostics;
  /** Names of connected game controllers (Gamepad API); empty until one reports a button press. */
  readonly gamepads: readonly string[];
}

export interface Diagnostics {
  /** 95th percentile of the emulation time per frame (ms) over the last minutes. */
  readonly frameTimeP95Ms: number | null;
  readonly audioUnderflows: number;
  readonly audioOverflows: number;
}

export interface SessionStateSource {
  subscribe(onChange: () => void): Unsubscribe;
  getSnapshot(): SessionState;
}

/** A button a view places in its slot header, e.g. mute on the screen (FR-027). */
export interface HeaderAction {
  readonly id: string;
  readonly label: string;
  readonly pressed?: boolean;
  readonly action: ViewAction;
}

/** What a view receives. Framework-independent; the React binding lives in src/app. */
export interface ViewContext {
  readonly size: ViewSize;
  /**
   * Read-only and subscribable; compatible with useSyncExternalStore. Per slot: throttled by
   * SetFrameRate and silent while the slot is not visible.
   */
  readonly frameState: FrameStateSource;
  /** Subscribe only, never publish. */
  readonly events: DomainEventSubscriber;
  readonly project: ProjectStateSource;
  /** Read-only emulator session: ROM header, run state, settings, audio. */
  readonly session: SessionStateSource;
  /** The only way to change anything. */
  dispatch(action: ViewAction): void;
  /** False while the slot is not visible; then frame updates must not be processed. */
  readonly visible: boolean;
}

/** What a mounted view instance gets from the grid; framework-independent (the React binding is in src/app). */
export interface ViewInstanceProps<S> {
  readonly context: ViewContext;
  readonly state: S;
  readonly setState: (next: S) => void;
}

/** What a view provides. `deserialize(serialize(s))` must yield an equivalent state. */
export interface ViewDefinition<S> {
  readonly typeId: ViewTypeId;
  readonly title: string;
  readonly icon: IconId;
  readonly initialState: S;
  serialize(state: S): JsonValue;
  deserialize(json: JsonValue): S;
  /** The view reads `FrameSnapshot.inspection`; the app asks for it while the view is visible (M1b). */
  readonly inspects?: true;
  /** Buttons for the slot header; zoom and view switching are added by the grid itself. */
  readonly headerActions?: (session: SessionState) => readonly HeaderAction[];
}
