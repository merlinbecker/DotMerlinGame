# Vertrag: Eventkanäle (M1)

Grundlage ist `specs/000-m0-scaffold/contracts/events.md`. Es bleibt bei genau zwei Kanälen, ohne
String-Bus.

## Kanal 1: FrameSnapshot – Änderung gegenüber M0

```ts
export interface FrameSnapshot {
  readonly frame: number;
  readonly cycles: number;
  readonly registers: Registers;
  readonly flags: Flags;
  readonly changedMemory: readonly MemoryRange[];
  /** NEW: 160×144 bytes, row-major, values 0–3 (DMG shade, 0 = lightest). */
  readonly screen: Uint8Array;
}
```

Regeln:
- `screen.length === 160 * 144`, jeder Wert liegt in `0..3` (Test).
- `changedMemory` enthält nur Schreibzugriffe auf `$8000–$FFFF`. Schreibzugriffe auf `$0000–$7FFF` sind
  MBC-Steuerung und kein Speicher. Bereiche überlappen nicht und sind aufsteigend sortiert.
- `changedMemory` deckt alle Schreibzugriffe **seit der letzten Veröffentlichung** ab, auch bei
  reduzierter Rate.
- Der Snapshot ist unveränderlich. `screen` und `bytes` sind Kopien und werden nicht mit WASM-Speicher
  geteilt.

`PublishRate`, `FrameStateSource` und `FrameStatePublisher` bleiben unverändert.

## Kanal 2: DomainEvent – Erweiterung der Union

```ts
export type DomainEvent =
  | { readonly type: 'RomLoaded'; readonly romId: string; readonly title: string }          // M0
  | { readonly type: 'RomRejected'; readonly reason: 'invalid' | 'cgb-only' | 'unsupported-cartridge' }
  | { readonly type: 'EmulatorHalted'; readonly reason: 'header-logo' | 'header-checksum' }
  | { readonly type: 'RunStateChanged'; readonly runState: 'empty' | 'running' | 'paused' | 'halted' }
  | { readonly type: 'StorageFailed'; readonly operation: 'save-rom' | 'save-battery' }
  | { readonly type: 'BuildFinished'; /* M0, unverändert */ }
  | { readonly type: 'BreakpointHit'; /* M0, unverändert */ }
  | { readonly type: 'ProjectChanged'; /* M0, unverändert */ };
```

- `RomLoaded.romId`: SHA-256 der ROM-Bytes (hex). So bleibt die ID stabil, wenn dasselbe ROM erneut
  geladen wird.
- Der Typ-Test (M0) wird um die neuen Varianten ergänzt, unbekannte `type`-Strings bleiben Typfehler.
