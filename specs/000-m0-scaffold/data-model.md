# Data Model: M0 – Gerüst

M0 speichert noch nichts dauerhaft. Die Entitäten beschreiben die Typen der Verträge; ihre genaue
Form steht in [contracts/](contracts/).

## FrameSnapshot

Zustand des Emulators zu einem Frame (Kanal 1, hochfrequent).

| Feld | Typ | Regel |
|---|---|---|
| `frame` | Ganzzahl ≥ 0 | streng steigend innerhalb eines Laufs |
| `cycles` | Ganzzahl ≥ 0 | Gesamtzyklen seit Reset |
| `registers` | `a, f, b, c, d, e, h, l` (8 Bit), `sp, pc` (16 Bit) | Wertebereich je Breite |
| `flags` | `z, n, h, c` (boolesch) | konsistent zu `registers.f` |
| `changedMemory` | Liste von `{ start, bytes }` | Bereiche dürfen sich nicht überlappen; `start + bytes.length ≤ 0x10000` |

Unveränderlich (readonly). Ein neuer Frame erzeugt einen neuen Snapshot.

## PublishRate

`full` | `reduced` (mit `everyNthFrame ≥ 2`) | `on-demand`. Bestimmt, wie oft Snapshots an
Abonnenten gehen; die Emulationsgeschwindigkeit ist davon unabhängig.

## DomainEvent (Kanal 2, getypte Union)

| `type` | Felder |
|---|---|
| `RomLoaded` | `romId`, `title` |
| `BuildFinished` | `success`, `errorCount`, `warningCount` |
| `BreakpointHit` | `address` (16 Bit), `bank` (Ganzzahl ≥ 0) |
| `ProjectChanged` | `projectId` |

Neue Ereignistypen entstehen nur durch Erweiterung der Union im Code, nie durch freie Strings.

## ViewAction

Aktionen, die ein View auslösen darf: `Pause`, `Resume`, `Reset`, `SetBreakpoint`,
`ClearBreakpoint`, `ButtonDown`, `ButtonUp` (Taste aus `Up, Down, Left, Right, A, B, Start, Select`).

## ViewDefinition / ViewState

| Feld | Bedeutung |
|---|---|
| `typeId` | eindeutige Kennung des View-Typs (z. B. `screen`) |
| `title`, `icon` | für die Kopfleiste |
| `initialState` | Startzustand |
| `serialize` / `deserialize` | Zustand ↔ JSON; `deserialize(serialize(s))` ergibt gleichwertigen Zustand |

## LayoutState

| Feld | Regel |
|---|---|
| `version` | Schemaversion, in M0 `1` |
| `slots` | Liste in Rasterreihenfolge; jeder Eintrag `null` (leer) oder `{ viewTypeId, viewState }` |

Enthält keine Projekt-, ROM- oder Emulatordaten. Länge 2–16.

## GridSpec

Ergebnis der Rasterberechnung aus Viewport und minimaler Slotgröße: `columns` und `rows` je 1–4,
`columns × rows ≥ 2`, `slotSize` (Kantenlänge der Quadrate).

## BuildVersion

Kurzer Commit-Hash, optional mit Suffix `-dirty`, oder `unknown` ohne Git.

## LicensePolicyResult

Je Paket: `name`, `version`, `license`, `scope` (`runtime` | `dev`), `verdict` (`ok` | `listed` |
`blocked`), `reason`. Der Check scheitert, sobald ein Paket `blocked` ist und keine Ausnahme mit
ADR-Verweis existiert.
