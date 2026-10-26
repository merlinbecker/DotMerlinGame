# ADR-0008: Eventmodell sowie Service Worker und Offline

- **Status**: akzeptiert
- **Datum**: 2026-10-18
- **Meilenstein**: M0 (Interfaces), M1 (Umsetzung), M7 (Service Worker)

## Kontext

Viele Views beobachten den Emulator. Ein globaler String-Bus wäre untypisiert und schwer testbar. Auf E-Ink-Geräten muss die Aktualisierungsrate drosselbar sein. Ein Service Worker würde Gerätetests in der Entwicklung durch alte Caches stören.

## Entscheidung

- **Zwei Kanäle** in `src/core/events/`:
  1. Frame-Zustand: unveränderlicher `FrameSnapshot` pro Frame; `FrameStateSource` passt zu `useSyncExternalStore`; Rate über `PublishRate` (`full`, `reduced` mit `everyNthFrame ≥ 2`, `on-demand`).
  2. Diskrete Ereignisse: getypte Union `DomainEvent` (`RomLoaded`, `BuildFinished`, `BreakpointHit`, `ProjectChanged`); kein `emit('…')` mit freien Strings. Views können nur abonnieren.
- Views ändern Zustand nur über `dispatch(ViewAction)`.
- **Kein Service Worker bis M7** (oder nur hinter Build-Flag); nur Manifest und Icons. Die Build-Version (Commit-Hash) ist immer sichtbar.

## Konsequenzen

Typ-Tests sichern ab, dass unbekannte Ereignisse nicht kompilieren und Views nicht veröffentlichen können. Offline-Fähigkeit kommt erst mit M7.

## Bezüge

Briefing Abschnitte 4, 5; Constitution II, IV, IX; `contracts/events.md`.

## Nachtrag M1b (2026-10-26): Inspektionsdaten im Frame-Zustand

**Kontext**: Die Speicher-Ansichten aus M1b (Hex, Registers, Tiles, Tilemaps, Sprites) brauchen den
Speicherinhalt des Emulators. Der übliche Lesepfad des Cores (`GB_safe_read_memory`) stößt PPU- und
APU-Nachberechnungen an und zeigt gesperrten Cartridge-RAM nicht (specs/004-m1b-memory-views/research.md R1).

**Entscheidung**:
- Es gibt **keinen dritten Kanal**. `FrameSnapshot` erhält das Feld `inspection: InspectionSnapshot | null`
  mit Kopien von VRAM, WRAM, OAM, I/O, HRAM, IE, allen Cartridge-RAM-Bänken, Bankständen, IME und HALT
  sowie einer Referenz auf die ROM-Kopie des Ladevorgangs. Register und Speicher stammen so aus demselben
  Frame.
- Gelesen wird ausschließlich über direkten Zugriff (`GB_get_direct_access`) und wenige markierte interne
  Felder, ohne Nebenwirkung auf Bild und Ton. Ein Test vergleicht 300 Frames je Test-ROM mit und ohne
  Inspektion.
- `inspection` wird nur gebaut, solange ein sichtbarer Slot einen View mit `inspects: true` zeigt
  (`setInspectionDemand`). Ohne Speicher-View bleibt M1 unverändert.
- Neue `ViewAction` `RequestSnapshot`: Der Slot fordert genau einen Snapshot an. Der Hub bündelt
  Anforderungen eines Tasks zu einem Bau und kennzeichnet die Lieferung (`getDeliveryKind()`). Andere Slots
  ignorieren sie, ihre Drosselung zählt nur echte Frames.
- Neues Ereignis `EmulatorReset`, damit Views auch nach einem Reset im laufenden Betrieb sofort den neuen
  Stand anfordern. `prime()` im Hub macht den Stand nach Laden, Reset und Halt abrufbar.

**Konsequenzen**: Views greifen weiter nie direkt in den Emulator. Der WASM-Wrapper hat sechs neue
Lesefunktionen (Artefakt neu gebaut, Nachbau geprüft). Details: `specs/004-m1b-memory-views/contracts/`.
