# Implementation Plan: M2 – Assembler, Editor, Export

**Branch**: `feature/firstSteps` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-m2-assembler-editor-export/spec.md`

## Summary

M2 schließt den Kreis Quelltext → Build → Emulator → Export. RGBDS v1.0.4 läuft selbst gebaut als WASM in einem
Worker (Spike: byte-identisch zum nativen RGBDS). CodeMirror 6 ist der Editor, `fflate` das ZIP. Projekte liegen in
IndexedDB und sind die einzige Wahrheit; ein ROM existiert nur als Build-Ergebnis im Speicher und überschreibt nie
das gespeicherte ROM aus M1.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Node.js 24; C++20 (RGBDS, unverändert); SM83-Assembler fürs Beispiel

**Primary Dependencies**: bestehend React 19.3.1 und SameBoy-WASM. Neu: RGBDS v1.0.4 als WASM,
`@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `fflate`

**Build Tools (nicht ausgeliefert)**: emsdk-Image aus M1, Bison 3.8.2

**Storage**: IndexedDB (eigene Projektdatenbank), Build-Ergebnisse nur im Speicher

**Testing**: Vitest (Unit, Vertrag, WASM unter Node), Playwright (Chromium)

**Target Platform**: aktuelles Chrome (Android, Desktop, E-Ink-Android)

**Project Type**: Single-Page-Web-App, rein clientseitig

**Performance Goals**: Build des Beispiels unter 5 s auf dem Mittelklasse-Smartphone (SC-003); Spike: etwa 300 ms
unter Node. Zusätzlicher Download: etwa 355 KB WASM und 91 KB Editor, jeweils gzip

**Constraints**: kein Netzwerk beim Build, Zeitgrenze 10 s, Graustufen, keine Bewegung, Blättern statt Scrollen,
kein seitliches Scrollen, kein Service Worker vor M7

**Scale/Scope**: 3 Views, 12 neue `ViewAction`s, 3 WASM-Module, 1 Beispielprojekt, 2 ADRs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Prüfung im Plan | Status |
|---|---|---|
| I. Quelltext als einzige Wahrheit | Projekte enthalten kein ROM. `RunBuild` schreibt nicht in `RomStore` (R8). Symbol- und Map-Datei bei jedem Build | ✅ |
| II. Emulator als Headless Service | Views dispatchen nur. Emulator-Zugriff nur in der Session | ✅ |
| III. Ports und Adapter | `AssemblerPort`, `ProjectStorePort`, `ArchivePort` in `src/core`. RGBDS, CodeMirror und fflate nur in `src/adapters` bzw. im Editor-Adapter (siehe Complexity Tracking) | ✅ mit Begründung |
| IV. Getypte Kanäle, Layout getrennt | Nur Union-Erweiterungen. Layout speichert nur `{ page }` | ✅ |
| V. E-Ink-first UI | FR-009, Tokens, kein Blinken (R6). Am Gerät noch zu prüfen | ✅ |
| VI. Lizenzsauberkeit | LICENSE-Dateien geprüft. Bison-Skelett mit Ausnahme: **vom Projektinhaber freigegeben**, ADR Pflicht. C++-Laufzeiten noch zu belegen (offener Punkt 1) | ✅ mit Auflage |
| VII. Hardware-Treue | `rgbfix -v` in der Pipeline, Logo und Checksumme automatisch getestet | ✅ |
| VIII. Tests pro Baustein | siehe [quickstart.md](quickstart.md) | ✅ |
| IX. Lokal und offline | Kein Backend, kein Service Worker. Kaltstart ohne Netz erst ab M7 (R4) | ✅ mit Grenze |
| X. Belegte Fakten | Spikes und Lizenzdateien belegt, Unsicheres in research.md | ✅ |
| Meilensteinreihenfolge | Keine Disassemblierung (M3), keine Symbolnavigation (M4), kein Tile-Editor (M5) | ✅ |

Nach Phase 1 erneut geprüft: unverändert erfüllt.

## Project Structure

### Documentation (this feature)

```text
specs/002-m2-assembler-editor-export/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ports.md
│   └── view-contract.md
└── tasks.md                 # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── build/               # diagnostics, highlight, build-state (neu, rein)
│   ├── project/             # model, path rules, example import (neu, rein)
│   ├── ports/               # assembler, project-store, archive (erweitert)
│   ├── events/, view/       # neue Aktionen, ProjectState
├── adapters/
│   ├── assembler/rgbds/     # worker, adapter, generated/ (WASM, BUILD-INFO)
│   ├── archive/             # fflate
│   ├── storage/             # idb helper, indexeddb-project-store
│   └── editor/              # CodeMirror hinter schmaler React-Komponente
├── app/session/             # project-session, emulator-session (+ Lauf-Quelle)
├── app/views/m2-views.ts
└── views/{editor,build,project}/
examples/hello/              # eigener Quelltext, MIT
scripts/build-assembler.sh
tests/{unit,contract,assembler,e2e}/
third_party/rgbds.md, third_party/emscripten.md, THIRD_PARTY_LICENSES
docs/adr/                    # 0011 RGBDS-WASM und Bison, 0012 Editor und ZIP
docs/arc42/                  # Kap. 4, 5, 7, 8, 9
docs/abnahme/m2.md
```

**Structure Decision**: wie M1b. Fachlogik rein in `src/core/`, ein Ordner pro View, Fremdcode in `src/adapters/`.

## Umsetzungsreihenfolge (Grobplanung für `/speckit-tasks`)

1. **ADR und Bau**: ADR-0011, `build-assembler.sh`, Lizenz der Laufzeiten belegen, CI-Job.
2. **Assembler-Adapter**: Worker, Zeitgrenze, Meldungen, Vergleich mit nativem RGBDS.
3. **Projektmodell und Speicher**: Modell, Pfadregeln, Project Store, Autosave.
4. **Build und Lauf (US1, US2)**: Project Session, `RunBuild`, Trennung vom gespeicherten ROM, Export `.gb`.
5. **Editor (US1, US5)**: ADR-0012, CodeMirror-Adapter, Tokenizer, Pager, Build-View.
6. **ZIP (US3)**: Adapter, Grenzen, Project-View, Konflikt beim Import.
7. **Beispiel (US4)**: `examples/hello/`, Neu aus Beispiel.
8. **Abnahme**: E2E, arc42, `docs/abnahme/m2.md`, Gerätetests, Version `0.5.0`.

## Offene Punkte für den Projektinhaber

Keine blockierenden Fragen. Die Punkte stehen in [research.md](research.md), Abschnitt „Offene Punkte“. Wichtig für
dich: Der Kaltstart ohne Netz funktioniert erst mit M7.

## Complexity Tracking

| Abweichung | Warum nötig | Einfachere Alternative verworfen, weil |
|---|---|---|
| Ausgelieferter Parser aus GPL-Skelett mit Ausnahme | RGBDS braucht ihn | Ohne ihn kein RGBDS als WASM; vom Projektinhaber freigegeben |
| Editor-Komponente im Adapter, eingebunden von einem View | CodeMirror ist Fremdcode (Constitution III), braucht aber das DOM | Eigener Editor: Aufwand und Risiko auf Android |
| Zweiter bereitstehender Worker | Ein Abbruch soll offline nicht das Bauen beenden | Ohne ihn wäre nach einem Abbruch ein Neuladen mit Netz nötig |
