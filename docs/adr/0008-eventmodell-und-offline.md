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
