# Implementation Plan: M0 – Gerüst

**Branch**: `feature/firstSteps` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/000-m0-scaffold/spec.md`

## Summary

M0 legt das lauffähige Fundament: eine statisch ausgelieferte React-App-Shell (Raster aus leeren
quadratischen Slots mit Kopfleisten, Build-Version in der Fußzeile, Manifest ohne Service Worker) im
Schwarz-Weiß-Theme aus Design-Tokens, ohne jede Bewegung. Dazu kommen die framework-unabhängigen
Verträge in `src/core/` (View-Vertrag, Frame-Zustand, getypte Ereignisse, Ports), Test-Rahmen,
Doku- und Lizenzgerüst sowie eine CI, die über `npm run check` Lint, Typen, Tests,
Chromium-Abnahmetests, Secret-Scan und Lizenz-Check ausführt. Details: [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3, Node.js 24 LTS (Build/Tooling)

**Primary Dependencies**: React 19.3.1, Vite 8.3.4 (+ @vitejs/plugin-react 6.1.2)

**Storage**: keine in M0 (IndexedDB ab M1/M2; Layout-Persistenz ab M1)

**Testing**: Vitest 5.0.5 (jsdom, Typ-Tests), @testing-library/react, Playwright 1.64.1 (nur Chromium)

**Target Platform**: aktuelles Chrome (Android, Desktop, E-Ink-Geräte mit Android); statisches Hosting (vorerst Replit)

**Project Type**: Single-Page-Web-App (PWA-Shell), rein clientseitig

**Performance Goals**: Shell bedienbar in < 3 s auf Mittelklasse-Smartphone (SC-002)

**Constraints**: kein Backend, nur statische Dateien, kein Service Worker, keine Animationen/Transitions,
nur Graustufen, UI-Texte Englisch im Code, Laufzeit-Lizenzen nur aus Freigabeliste

**Scale/Scope**: 1 App-Shell, 4 Verträge, ~8 ADRs, CI mit einem Workflow

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Prüfung im Plan | Status |
|---|---|---|
| I. Quelltext als einzige Wahrheit | Assembler-Port liefert ROM, Symbol- und Map-Datei als Build-Ergebnis (Vertrag in `contracts/ports.md`) | ✅ |
| II. Emulator als Headless Service | View-Vertrag gibt Views nur lesenden Zugriff + Aktionskanal; ESLint verbietet Adapter-Importe in Views | ✅ |
| III. Ports und Adapter | Ports in `src/core/ports/`, `src/core` per ESLint frei von React/Adaptern | ✅ |
| IV. Getypte Eventkanäle, Layout getrennt | Zwei Kanäle als Typen, Typ-Test gegen unbekannte Ereignisse; `LayoutState` enthält nur Belegung; `PROJECT_NAME` einmalig | ✅ |
| V. E-Ink-first UI | Tokens als einzige Literalquelle, Stylelint-Regeln, Chromium-Tests auf Animationen und Graustufen | ✅ |
| VI. Lizenzsauberkeit | Zweistufiger Lizenz-Check, `third_party/`, `THIRD_PARTY_LICENSES`, MIT-`LICENSE`, `.gitignore` für ROMs. **Auslegung**: „Fremdkomponente“ = ausgelieferter Code (Laufzeit-Abhängigkeiten, übernommene Komponenten); Entwicklungswerkzeuge brauchen keinen `third_party/`-Eintrag und kein ADR. Festgehalten in ADR-0003 und Constitution 1.1.2. | ✅ (mit Auslegung) |
| VII. Hardware-Treue | Boot-Zustandstest als Rahmen (`it.todo`), Umsetzung M1 | ✅ (vorbereitet) |
| VIII. Tests pro Baustein | Unit-, Vertrags-, Typ- und E2E-Tests; `npm run check` = CI | ✅ |
| IX. Lokal und offline | Nur statischer Build, kein Service Worker, keine Laufzeit-Netzwerkzugriffe | ✅ |
| X. Belegte Fakten | Versionen/Lizenzen geprüft; PNG-vs-SVG-Icon als offener Punkt markiert | ✅ |
| Meilensteinreihenfolge | Keine Emulator-, Speicher- oder Editor-Logik; nur Verträge | ✅ |

Keine Verstöße. Nach Phase 1 erneut geprüft: unverändert erfüllt.

## Project Structure

### Documentation (this feature)

```text
specs/000-m0-scaffold/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── view-contract.md
│   ├── events.md
│   ├── ports.md
│   └── npm-scripts.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
.github/workflows/ci.yml
build/
└── manifest-plugin.ts        # Manifest + <title> aus PROJECT_NAME
scripts/
├── check-licenses.mjs        # zweistufiger Lizenz-Check
├── generate-third-party.mjs  # erzeugt THIRD_PARTY_LICENSES
└── render-icons.mjs          # SVG-Logo → PNG 192/512 (einmalig)
public/icons/                 # logo.svg, icon-192.png, icon-512.png
src/
├── config/project.ts         # PROJECT_NAME (einzige Stelle)
├── core/
│   ├── events/               # frame-state.ts, domain-events.ts
│   ├── ports/                # emulator.ts, assembler.ts, project-store.ts, archive.ts
│   ├── view/                 # view-contract.ts
│   └── layout/               # layout-state.ts
├── app/
│   ├── main.tsx
│   ├── shell/                # AppShell, Footer (Build-Version)
│   ├── layout/               # grid.ts (reine Rasterberechnung), Grid, Slot, SlotHeader
│   └── theme/                # tokens.css, base.css (Motion-Regel)
├── views/                    # leer bis M1 (README)
└── adapters/                 # leer bis M1 (README)
tests/
├── unit/                     # grid, license policy, build version
├── contract/                 # *.test-d.ts für Verträge, Dummy-View
├── roundtrip/                # it.todo (M3)
├── boot-state/               # it.todo (M1)
├── tooling/                  # Secret-Scan-Erkennung
└── e2e/                      # Playwright (Chromium)
docs/adr/                     # 0000-template.md, 0001–0003, 0005, 0007–0010
third_party/                  # README.md, npm.md, license-exceptions.json
LICENSE                       # MIT
THIRD_PARTY_LICENSES
.gitignore                    # *.gb, *.gbc, *.sgb, roms/, Boot-ROM-Namen, dist/, Testberichte
```

**Structure Decision**: Single-Project-Struktur gemäß Briefing Abschnitt 6. `build/` und `scripts/`
enthalten nur Build-Werkzeuge, kein ausgelieferter Code.

## Umsetzungsreihenfolge (Grobplanung für `/speckit-tasks`)

1. Repo-Grundlagen: `package.json`, TypeScript, Vite, `.gitignore`, `LICENSE`, `.nvmrc`
2. Lint und Tokens: ESLint (inkl. Architekturregeln), Stylelint, `tokens.css`, Motion-Regel
3. Verträge in `src/core/` mit Typ- und Vertragstests
4. App-Shell: Raster, Slots, Kopfleisten, Fußzeile mit Build-Version, Manifest-Plugin, Icons
5. Test-Rahmen (Unit, `it.todo` für Roundtrip und Boot-Zustand, Playwright-Abnahmetests)
6. Lizenz- und Secret-Check, `third_party/`, `THIRD_PARTY_LICENSES`
7. CI-Workflow
8. ADRs (0000-Vorlage, 0001–0003, 0005, 0007–0010; ADR-0003 hält zweistufigen Lizenz-Check und
   Umfang von `third_party/` fest), arc42-Kapitel 5 und 8 nachziehen,
   Befehle in `CLAUDE.md` eintragen

## Complexity Tracking

Keine Verstöße gegen die Constitution; Abschnitt entfällt.
