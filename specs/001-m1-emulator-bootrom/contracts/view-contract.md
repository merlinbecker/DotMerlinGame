# Vertrag: View-Vertrag (M1)

Grundlage ist `specs/000-m0-scaffold/contracts/view-contract.md`. Views lesen nur und ändern ausschließlich
über `dispatch` (Constitution II).

## ViewAction – Erweiterung der Union

```ts
export type ViewAction =
  // M0
  | { readonly type: 'Pause' } | { readonly type: 'Resume' } | { readonly type: 'Reset' }
  | { readonly type: 'ButtonDown'; readonly button: Button }
  | { readonly type: 'ButtonUp'; readonly button: Button }
  | { readonly type: 'SetBreakpoint'; /* … */ } | { readonly type: 'ClearBreakpoint'; /* … */ }
  // NEW in M1
  | { readonly type: 'LoadRom'; readonly bytes: Uint8Array; readonly fileName: string }
  | { readonly type: 'StartStoredRom' }
  | { readonly type: 'SetBootMode'; readonly bootMode: BootMode }
  | { readonly type: 'SetHardwareChecks'; readonly enabled: boolean }
  | { readonly type: 'SetVolume'; readonly volume: number }
  | { readonly type: 'SetMuted'; readonly muted: boolean }
  | { readonly type: 'UnlockAudio' }
  /** Handled per slot by the app, never by the emulator (FR-022). */
  | { readonly type: 'SetFrameRate'; readonly rate: PublishRate };
```

- Den Hinweis „ROM samt Spielstand wird ersetzt“ zeigt der View „ROM Info“ **vor** dem Dispatch von
  `LoadRom`. Der Dienst ersetzt ohne weitere Rückfrage.
- `SetBootMode`/`SetHardwareChecks` wirken beim nächsten Start oder Reset und werden gespeichert.

## ViewContext – Änderung gegenüber M0

```ts
export interface ViewContext {
  readonly size: ViewSize;
  /** CHANGED semantics: per-slot source; throttled by SetFrameRate, silent while not visible. */
  readonly frameState: FrameStateSource;
  readonly events: DomainEventSubscriber;
  readonly project: ProjectStateSource;
  /** NEW: read-only emulator session state (ROM header, run state, settings, audio). */
  readonly session: SessionStateSource;
  dispatch(action: ViewAction): void;
  readonly visible: boolean;
}

export interface SessionStateSource {
  subscribe(onChange: () => void): Unsubscribe;
  getSnapshot(): SessionState;
}

export interface SessionState {
  readonly runState: 'empty' | 'running' | 'paused' | 'halted';
  readonly rom: RomHeaderInfo | null;
  readonly fileName: string | null;
  readonly settings: { readonly bootMode: BootMode; readonly hardwareChecks: boolean };
  readonly audio: { readonly muted: boolean; readonly volume: number; readonly unlocked: boolean };
  readonly notice: Notice | null;
}

export type Notice =
  | { readonly kind: 'header-invalid' }        // ROM gestartet ohne „Hardware-nah“
  | { readonly kind: 'halted'; readonly reason: 'header-logo' | 'header-checksum' }
  | { readonly kind: 'rejected'; readonly reason: 'invalid' | 'cgb-only' | 'unsupported-cartridge' }
  | { readonly kind: 'storage-full' }
  | { readonly kind: 'audio-locked' };
```

`RomHeaderInfo`: siehe [data-model.md](../data-model.md).

## Pro-Slot-Frame-Quelle (`src/app/layout/slot-frame-source.ts`)

- Jeder Slot bekommt einen eigenen `FrameStateSource`, der den Emulator-Publisher umhüllt.
- `visible === false` (ausgeblendet, durch Zoom verdeckt, Tab im Hintergrund): keine Benachrichtigung,
  `getSnapshot()` liefert den zuletzt zugestellten Snapshot. Damit gilt SC-006, gemessen per Zähler im Test.
- `SetFrameRate` `reduced(n)`: jeder n-te Emulator-Frame wird zugestellt. `on-demand`: nur nach
  ausdrücklicher Anforderung.
- Die globale Emulator-Rate ist `full`, solange mindestens ein sichtbarer Slot `full` oder `reduced`
  abonniert, sonst `on-demand`. Die Emulationsgeschwindigkeit hängt nie davon ab.

## Views in M1

| `typeId` | Titel (UI, Englisch) | Liest | Dispatcht |
|---|---|---|---|
| `screen` | Screen | `frameState.screen`, `session.audio` | `SetFrameRate`, `SetMuted` (Kopfleiste), `UnlockAudio` |
| `controller` | Controller | – | `ButtonDown`/`ButtonUp`, `UnlockAudio` |
| `rom-info` | ROM Info | `session` | `LoadRom`, `StartStoredRom`, `SetBootMode`, `SetHardwareChecks`, `Pause`/`Resume`/`Reset`, `SetVolume`, `UnlockAudio` |
| `memory-map` | Memory Map | `session.rom` (Bankzahl) | – |

Der Stumm-Schalter in der Kopfleiste des Screen-Views (FR-027) ist ein vom View bereitgestelltes
Kopfleisten-Element. Die Kopfleiste bleibt Teil des Rasters. Mechanik: Erweiterung von `ViewDefinition`
um optionale `headerActions`, genau festgelegt in `tasks.md`.
