# Implementation Plan: M1b – Speicher-Ansichten (nur lesen)

**Branch**: `feature/firstSteps` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-m1b-memory-views/spec.md`

## Summary

M1b bringt fünf nur lesende Views: Hex, Registers, Tiles, Tilemaps, Sprites. Sie zeigen den Zustand des
laufenden Emulators. Die Daten kommen als typisierte Erweiterung des Frame-Zustands: `FrameSnapshot`
erhält `inspection`. Gebaut wird `inspection` nur, solange ein sichtbarer Slot sie braucht.

Der Wrapper liest dafür ausschließlich über `GB_get_direct_access` und wenige markierte
`GB_INTERNAL`-Felder. Der übliche Lesepfad des Cores stößt PPU- und APU-Syncs an und zeigt gesperrten
Speicher nicht. Er würde damit FR-012 und Clarification Q4 verletzen (research.md R1). Derselbe Befund
betrifft `changedMemory` aus M1. Er wird zuerst mit einem Identitätstest geprüft und dann behoben
(research.md R2).

Die Views drosseln über die vorhandene Pro-Slot-Rate: „Live“ jeden 6. Frame, „1/s“ jeden 60. Frame,
„Manual“ nur auf Anforderung. Sie fordern bei Pause, Halt, Laden und Reset genau einen Snapshot an. Für
Refresh gibt es eine neue `ViewAction` `RequestSnapshot`. Die Hardware-Fakten (Registernamen, Kachelformat,
Karten, OAM) stehen als reine Funktionen in `src/core/inspect/` mit Pan-Docs-Quelle. Vier neue Test-ROMs
belegen die Werte.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Node.js 24; C (gnu11) für den Wrapper; SM83-Assembler (RGBDS
v1.0.4) für Test-ROMs

**Primary Dependencies**: React 19.3.1, SameBoy `Core/` @ `26a56bd` als WASM, alle bestehend; keine neuen
Laufzeit-Abhängigkeiten

**Build Tools (nicht ausgeliefert)**: emsdk-Docker-Image aus M1 (Wrapper-Neubau), RGBDS v1.0.4

**Storage**: localStorage (View-Zustand je Slot im Layout), keine neue Persistenz

**Testing**: Vitest (Unit, Vertrag, Typ, Emulator-Integration mit WASM unter Node, View-Rendering),
Playwright (Chromium), vier neue Test-ROMs

**Target Platform**: aktuelles Chrome (Android, Desktop, E-Ink-Android). Referenzgeräte: Boox Palma und
Boox Go Color 7

**Project Type**: Single-Page-Web-App, rein clientseitig

**Performance Goals**: SC-002: Screen plus ein View auf „Live“ ergibt `frameWorkP95Ms` < 16,7 ms und
`emulatedFps` ≥ 59 (research.md R12). Kopierkosten laut Spike 5–25 µs pro Snapshot (R4).

**Constraints**:
- Keine Nebenwirkung des Lesens auf Bild oder Ton (SC-003).
- Kein Schreibweg.
- Kein dritter Eventkanal.
- Nur Graustufen und keine Animation.
- Blättern statt Scrollen.
- Kein horizontales Scrollen auf dem Palma im Hochformat.

**Scale/Scope**:
- 5 Views
- 6 neue Wrapper-Funktionen
- 1 neue `ViewAction`, 1 neues `DomainEvent`
- 8 reine Domänenmodule
- 4 Test-ROMs
- 1 ADR-Nachtrag (0008)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Prüfung im Plan | Status |
|---|---|---|
| I. Quelltext als einzige Wahrheit | M1b zeigt nur an und ändert nichts am Übergang nach ADR-0005 (ROM direkt ausführen bis M3). Kein ROM wird im Projekt gespeichert | ✅ |
| II. Emulator als Headless Service | Views lesen nur `frameState`, `session` und `events`. `dispatch` nur mit `SetFrameRate`/`RequestSnapshot` (Typ-Test). Kein Lesezugriff zur Renderzeit in den Emulator (R4, R5) | ✅ |
| III. Ports und Adapter | Neue Wrapper-Funktionen nur im SameBoy-Adapter. Hardware-Wissen fremdcodefrei in `src/core/inspect/` | ✅ |
| IV. Getypte Kanäle, Layout getrennt | `inspection` ist ein Feld im bestehenden Snapshot. `RequestSnapshot` und `EmulatorReset` sind Union-Erweiterungen. Der View-Zustand (Bereich, Bank, Rate, Palette) liegt im Slot und enthält keine Emulatordaten | ✅ |
| V. E-Ink-first UI | Graustufen aus den E-Ink-Tokens. Markierung durch Invertieren oder Rahmen. Blättern statt Scrollen. Zeilenbreite 8/16 je nach Platz. Raten 1/s als Start. Refresh in der Kopfleiste. Keine Gesten | ✅ |
| VI. Lizenzsauberkeit | Kein neuer Fremdcode. SameBoy wird nur über den eigenen Wrapper genutzt, am Core gibt es keinen Patch. `third_party/sameboy.md` bekommt einen Vermerk zum neuen Wrapper-Stand. Pan Docs ist CC0, Fakten mit Quellenkommentar | ✅ |
| VII. Hardware-Treue | Neue Test-ROMs laufen mit eigener Boot-ROM und im Direktstart identisch (`modes-identical`) | ✅ |
| VIII. Tests pro Baustein | Unit-Tests für jedes Domänenmodul, Vertrag, Emulator-Integration mit Test-ROMs, Identitätstest, View-Tests, E2E | ✅ |
| IX. Lokal und offline | Nichts Neues zur Laufzeit aus dem Netz | ✅ |
| X. Belegte Fakten | Core-Verhalten mit Fundstellen (R1, R3, R10, R11). Pan-Docs-Fakten mit Commit (R9). Kopierkosten gemessen (R4). Offene Punkte benannt | ✅ |
| Meilensteinreihenfolge | Kein Schreiben, kein Step, keine Breakpoints, keine Bit-Aufschlüsselung (M4), keine Symbole (M2/M4), kein Tile-Editor (M5) | ✅ |

Nach Phase 1 erneut geprüft: unverändert erfüllt.

## Project Structure

### Documentation (this feature)

```text
specs/004-m1b-memory-views/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── frame-state.md       # InspectionSnapshot, Bedarf, prime
│   ├── view-contract.md     # RequestSnapshot, EmulatorReset, inspects, Pflichten der Views
│   └── wasm-abi.md          # neue Wrapper-Funktionen
└── tasks.md                 # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── events/              # frame-state.ts (+inspection, +setInspectionDemand), frame-state-hub.ts (+prime, gebündelte Anforderungen), domain-events.ts (+EmulatorReset)
│   ├── view/                # view-actions.ts (+RequestSnapshot), view-contract.ts (+inspects, Diagnostics +frameWorkP95Ms, +emulatedFps)
│   └── inspect/             # io-registers, areas, tiles, tilemap, oam, palette, changes, hex-layout (neu)
├── adapters/emulator/sameboy/
│   ├── wrapper.c            # + dmg_area, dmg_io, dmg_ie, dmg_banks, dmg_cart_ram_enabled, dmg_cpu_flags
│   ├── sameboy-emulator.ts  # inspection bauen, changedRanges ohne dmg_peek, prime, Messung
│   └── generated/           # neu gebaut (core:build), BUILD-INFO.json
├── app/
│   ├── layout/              # Slot.tsx (+RequestSnapshot), slot-frame-source.ts (Anforderung nur für den eigenen Slot), frame-demand.ts (+Inspektionsbedarf), layout-store.ts (Zyklus)
│   ├── session/             # emulator-session.ts (+EmulatorReset, Diagnose)
│   └── views/               # m1b-views.ts (Registrierung)
├── app/theme/tokens.css     # + Monospace-Schrift, Mindestschriftgröße, Markierungs-Tokens
└── views/
    ├── inspect-common/      # Raten-Leiste, Pager, Kachel-Canvas, useInspection (Snapshot-Anforderung bei Ereignissen)
    ├── hex/
    ├── registers/
    ├── tiles/
    ├── tilemaps/
    └── sprites/
scripts/build-core.sh        # Exportliste ergänzt
tests/
├── roms/src/                # inspect-mem.asm, inspect-regs.asm, inspect-gfx.asm, roms.json
├── emulator/                # inspection.test.ts, inspection-identity.test.ts, modes-identical (+neue ROMs)
├── unit/                    # inspect-*.test.ts, frame-state-hub, frame-demand, emulator-session
├── contract/                # Typen, Slot-Verhalten, Dispatch-Grenze
├── views/                   # Rendering je View mit echten Snapshots
└── e2e/                     # m1b-*.spec.ts
docs/adr/0008-…              # Nachtrag: Inspektionsdaten im Frame-Zustand
docs/arc42/                  # Kap. 5 (Bausteine), 6 (Laufzeit: Snapshot-Anforderung), 8 (Lesen ohne Nebenwirkung), 9
docs/abnahme/m1b.md          # Abnahmeprotokoll
third_party/sameboy.md       # Wrapper-Stand, genutzte GB_INTERNAL-Felder
```

**Structure Decision**:
- Struktur wie M1: ein Ordner pro View und gemeinsame Bausteine in `src/views/inspect-common/`.
- Hardware-Wissen liegt in `src/core/inspect/`. Es ist rein, testbar und wird später vom Debugger (M4) und
  vom Tile-Editor (M5) wiederverwendet.

## Umsetzungsreihenfolge (Grobplanung für `/speckit-tasks`)

1. **Befund absichern**: Identitätstest gegen den M1-Code (R2). Ergebnis notieren.
2. **Wrapper und Adapter**:
   - neue WASM-Funktionen, `core:build`, Artefakt committen
   - `inspection` bauen, `changedRanges` ohne `dmg_peek`, `prime`
   - Identitätstest grün
   - `third_party/sameboy.md`
3. **Verträge**:
   - `inspection`, `setInspectionDemand`, `RequestSnapshot`, `EmulatorReset`, `inspects`
   - Typ- und Vertragstests
   - Slot und Frame-Demand
   - ADR-0008-Nachtrag
4. **Test-ROMs** `inspect-mem`, `inspect-regs`, `inspect-gfx`(`-tall`) und Integrationstest `inspection`
   (SC-001-Grundlage).
5. **Domänenmodule** `src/core/inspect/` mit Pan-Docs-Tabellen und Unit-Tests.
6. **Gemeinsame View-Bausteine**: Raten-Leiste, Snapshot-Anforderung, Kachel-Canvas mit E-Ink-Graustufen,
   Pager, Tokens.
7. **Views in Prioritätsreihenfolge**: Hex und Registers (P1), danach Tiles, Tilemaps und Sprites (P2).
   Jeder View mit View-Test.
8. **Diagnose**: `frameWorkP95Ms` und `emulatedFps` in ROM Info (R12).
9. **E2E und Abnahme**:
   - Playwright-Szenarien
   - Gerätetests auf Palma, Go Color 7 und dem Smartphone
   - `docs/abnahme/m1b.md`
   - arc42 Kap. 5/6/8/9
   - Versionssprung auf die nächste Minor-Version bei Abnahme

## Offene Punkte für den Projektinhaber

1. **IME und HALT im View „Registers“?**
   - Beide sind belegt lesbar (research.md R10).
   - FR-006 verlangt sie nicht.
   - Vorschlag: als zwei zusätzliche Zeilen „IME“ und „HALT“ anzeigen (Zeichen, keine Farbe). Das ist
     kleiner Aufwand und hilfreich beim Verstehen von Interrupts.
   - Bei Zustimmung wird FR-006 um einen Satz ergänzt.
2. **Messung für SC-002**:
   - Die Messung aus M1 erfasst nur die Emulation.
   - Vorschlag: SC-002 mit zwei neuen Diagnosewerten prüfen, `frameWorkP95Ms` < 16,7 ms und
     `emulatedFps` ≥ 59 (research.md R12).
   - Die Spec nennt „Messung wie SC-003 aus M1“. Das wird bei Zustimmung präzisiert.
3. **Nicht blockierende Prüfpunkte**: siehe [research.md](research.md), Abschnitt „Offene Punkte“.

## Complexity Tracking

| Abweichung | Warum nötig | Einfachere Alternative verworfen, weil |
|---|---|---|
| Weitere `GB_INTERNAL`-Felder im Wrapper (`div_counter`, `mbc_ram_enable`, `cartridge_type`, `ime`, `halted`) | DIV steht nicht in `io_registers`. „Gesperrt“ (Q4), IME und HALT gibt es in der öffentlichen API nicht | `GB_safe_read_memory` hat Nebenwirkungen und zeigt gesperrten RAM nicht (R1). Ein Core-Patch wäre eine veränderte Fremdkomponente |
| Inspektionsbedarf als eigener Schalter im Hub | 3–9 MB Müll pro Sekunde sparen, solange kein Speicher-View sichtbar ist (R4) | Immer mitkopieren belastet schwache E-Ink-Geräte ohne Nutzen |
| Neuer WASM-Build (Binärartefakt-Commit) | Wrapper-Funktionen sind nötig für R1 | Kein Lesepfad ohne Nebenwirkung über die bestehenden Exporte |
