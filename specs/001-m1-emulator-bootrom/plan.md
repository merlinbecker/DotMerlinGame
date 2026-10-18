# Implementation Plan: M1 – Emulator-Kern und eigene Boot-ROM

**Branch**: `feature/firstSteps` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-m1-emulator-bootrom/spec.md`

## Summary

M1 bringt einen lauffähigen DMG-01-Emulator als Headless Service in den Browser. Kern ist **SameBoy**
(`Core/`, Expat). Er wird aus einem festen Commit per Emscripten in einem per Digest festgelegten
Docker-Image nach WASM gebaut. Das Artefakt wird committet, ein eigener CI-Job baut es nach und vergleicht
die Hashes.

Eine selbst geschriebene 256-Byte-Boot-ROM (RGBDS v1.0.4) zeigt das eigene Logo und hinterlässt den
Pan-Docs-Zustand (DMG). Der Direktstart setzt im eigenen Wrapper exakt denselben Übergabezustand. Der
Modus „Hardware-nah“ prüft Logo-Hash und Header-Checksumme in eigenem Code, Nintendo-Bytes kommen nicht
ins Repo.

Vier Views (Screen mit E-Ink-Modus, Controller, ROM Info, Memory Map), Ton über AudioWorklet, ein
gespeichertes ROM samt Spielstand in IndexedDB, Zoom im Raster. Die Verträge aus M0 werden gezielt
erweitert. Herkunft und Bauweg des Cores werden in ADR-0006, `third_party/` und arc42 Kapitel 7/8
nachvollziehbar festgehalten. Details: [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3, Node.js 24; C (gnu11) für den SameBoy-Wrapper; SM83-Assembler
(RGBDS) für Boot-ROM und Test-ROMs

**Primary Dependencies**: React 19.3.1 (bestehend); SameBoy `Core/` @ `26a56bd` als WASM (ausgeliefert);
Emscripten-Laufzeit (ausgeliefert, im WASM)

**Build Tools (nicht ausgeliefert)**: emsdk 6.0.11 (Docker, Digest festgelegt), RGBDS v1.0.4 (Linux-Binary,
SHA-256 festgelegt)

**Storage**: IndexedDB (ein ROM + Spielstand), localStorage (Einstellungen, Layout)

**Testing**: Vitest (Unit, Vertrag, Typ, Emulator-Integration mit WASM unter Node), Playwright (Chromium),
selbst gebaute Test-ROMs (`tests/roms/src/*.asm`, gebaut beim Testen, nie committet)

**Target Platform**: aktuelles Chrome (Android, Desktop, E-Ink-Android); statisches Hosting

**Project Type**: Single-Page-Web-App, rein clientseitig

**Performance Goals**: ca. 60 fps Emulation auf einem Mittelklasse-Smartphone (SC-003). Spike: 0,9 ms pro
Frame im Codespace bei 16,7 ms Budget. Start in < 5 s (SC-005). Eingabe ≤ 1 Frame (SC-004).

**Constraints**: kein Backend, kein `SharedArrayBuffer` (keine COOP/COEP-Abhängigkeit), keine
Laufzeit-Netzzugriffe, nur Graustufen und keine UI-Bewegung (außer Spielinhalt), Boot-ROM genau 256 Byte,
keine Nintendo- oder fremden Boot-ROM-Bytes

**Scale/Scope**: 1 Core-Adapter, 1 Audio-Adapter, 1 Storage-Adapter, 4 Views, ~10 Test-ROMs, 2 neue ADRs
(0004, 0006), 1 ADR-Nachtrag (0005)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Prüfung im Plan | Status |
|---|---|---|
| I. Quelltext als einzige Wahrheit | M1 führt ROMs direkt aus. Das ist die in Spec und ADR-0005 vorgesehene Übergangslösung. ROM liegt im eigenen `RomStorePort`, nie im Projekt. ADR-0005 erhält einen Nachtrag | ✅ (Übergang dokumentiert) |
| II. Emulator als Headless Service | `EmulatorPort` ohne UI. Views lesen `frameState`/`session`/`events`, schreiben nur über `dispatch`. ESLint verbietet Adapter-Importe in Views | ✅ |
| III. Ports und Adapter | Neue Ports `RomStorePort`, `AudioOutputPort`. SameBoy nur in `src/adapters/emulator/sameboy/`, Header-Logik fremdcodefrei in `src/core/rom/` | ✅ |
| IV. Getypte Kanäle, Layout getrennt | Nur Union-Erweiterungen, kein String-Bus. Rate pro Slot, E-Ink ohne Emulator-Sonderlogik. `LayoutState` nur um `maximizedSlot` erweitert. Schlüssel und DB-Namen aus `PROJECT_NAME` | ✅ |
| V. E-Ink-first UI | Nur Spielinhalt ausgenommen. Tokens, keine Hover, Kopfleiste für View-Wechsel, Zoom nur per Schalter (keine Zoom-Geste, PI: sparsam mit Gesten) | ✅ |
| VI. Lizenzsauberkeit | SameBoy Expat und Emscripten MIT/NCSA anhand der LICENSE-Dateien geprüft, musl MIT. Gelinkte System-Bibliotheken werden bei der Übernahme geprüft. `third_party/` + `THIRD_PARTY_LICENSES` im selben Commit, Lizenztext auch in `dist/`. `BootROMs/` wird nicht gebaut. Test-ROMs nie committet | ✅ |
| VII. Hardware-Treue | Eigene Boot-ROM ohne fremde Bytes, Endzustand laut Pan Docs (DMG) inkl. F-Flags und DIV, als Tests. Beide Startmodi mit identischem Übergabezustand (Test). Nur DMG, CGB-only wird abgelehnt | ✅ |
| VIII. Tests pro Baustein | Unit, Vertrag, Emulator-Integration mit echten Test-ROMs, E2E. Nachbau-Checks für Core und Boot-ROM | ✅ |
| IX. Lokal und offline | Rein statisch, kein Service Worker, kein SAB/COOP. Persistenz IndexedDB/localStorage. Netz nur für Entwicklungswerkzeuge (RGBDS, Docker), nie zur Laufzeit | ✅ |
| X. Belegte Fakten | Lizenzen aus LICENSE-Dateien, Core per Spike gemessen, Werte aus Pan Docs (CC0). Bildrate, Register-Tabelle und Link-Bibliotheken als offene Punkte markiert | ✅ |
| Meilensteinreihenfolge | Kein Assembler-Editor, kein Disassembler, kein Debugger-UI. `step`/Breakpoints bleiben nur im Port (M4). RGBDS nur als Entwicklungswerkzeug für eigene ROMs, nicht in der App | ✅ |

**Begründete Auslegung**: Die Formulierung „`npm run check` genau wie die CI“ wird auf Wunsch des
Projektinhabers eingeschränkt: Der Docker-basierte Core-Nachbau läuft nur im CI-Job `core-reproducible`
und lokal per `npm run core:verify`. `CLAUDE.md` und arc42 Kapitel 8.7 werden angepasst (Rückfrage zur
Änderung außerhalb des Moduls ist erfolgt).

Nach Phase 1 erneut geprüft: unverändert erfüllt.

## Project Structure

### Documentation (this feature)

```text
specs/001-m1-emulator-bootrom/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ports.md
│   ├── events-and-frame-state.md
│   ├── view-contract.md
│   ├── layout.md
│   ├── wasm-abi.md
│   └── build-pipeline.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
.github/workflows/ci.yml            # + Job core-reproducible
scripts/
├── build-core.sh                   # SameBoy → WASM (Docker, festgelegter Commit + Digest)
├── fetch-rgbds.ts                  # RGBDS v1.0.4 nach .tools/ (SHA-256)
├── build-test-roms.ts              # Test-ROMs + logo-hash.generated.ts
├── build-bootrom.ts                # Boot-ROM → generated/dmg-boot.ts
├── check-licenses.ts               # + Komponenten außerhalb von npm
└── generate-third-party.ts         # + third_party/*.md
src/
├── core/
│   ├── ports/                      # emulator.ts (erweitert), rom-store.ts, audio-output.ts (neu)
│   ├── events/                     # frame-state.ts (+screen), domain-events.ts (+Varianten), domain-event-bus.ts, frame-state-hub.ts
│   ├── view/                       # view-actions.ts (+Aktionen), view-contract.ts (+session)
│   ├── layout/                     # layout-state.ts (+maximizedSlot)
│   └── rom/                        # header.ts, memory-map.ts, logo-hash.generated.ts
├── adapters/
│   ├── emulator/
│   │   ├── frame-clock.ts          # Taktung (rAF, Audio-Füllstand)
│   │   ├── sameboy/                # wrapper.c, sameboy-emulator.ts, generated/{sameboy.mjs,sameboy.wasm,BUILD-INFO.json}
│   │   └── bootrom/                # dmg-boot.asm, generated/{dmg-boot.ts,BUILD-INFO.json}
│   ├── audio/                      # web-audio-output.ts, audio-worklet-processor.ts, ring-buffer.ts
│   └── storage/                    # indexeddb-rom-store.ts
├── app/
│   ├── session/                    # emulator-session.ts (Orchestrierung, ohne React), settings-store.ts
│   ├── views/                      # registry.ts (typeId → View)
│   └── layout/                     # + slot-frame-source.ts, frame-demand.ts, layout-store.ts, layout-zoom.ts, view-cycle.ts
└── views/
    ├── screen/                     # Canvas, E-Ink-Modus (Mapping, Dithering, Rate)
    ├── controller/                 # Touch + Tastatur, Mehrfachdruck
    ├── rom-info/                   # Laden, Startmodus, Pause/Reset, Lautstärke, Header-Daten
    └── memory-map/                 # Adressbereiche mit Bänken
tests/
├── roms/src/*.asm                  # eigene Test-ROMs (build/ gitignored)
├── boot-state/                     # Pan-Docs-Fixture (mit Quelle), Übergabe-Äquivalenz
├── emulator/                       # Modi, MBC, Batterie, Ton, Hardware-nah, Determinismus
├── unit/ · contract/ · e2e/
third_party/                        # sameboy.md, emscripten.md (neu)
docs/adr/                           # 0004-boot-rom-strategie.md, 0006-emulator-core.md (neu), 0005 Nachtrag
docs/arc42/                         # Kap. 4, 5, 7, 8, 9 aktualisiert (s. u.)
docs/abnahme/m1.md                  # Abnahmeprotokoll
.gitignore                          # + .tools/, tests/roms/build/
```

**Structure Decision**: Single-Project-Struktur gemäß Briefing Abschnitt 6. Generierte Artefakte liegen
neben ihrer Quelle in `generated/`-Ordnern mit `BUILD-INFO.json`. Sie werden committet, nicht von Hand
bearbeitet und nachgebaut geprüft.

## Dokumentation der Herkunft (Vorgabe des Projektinhabers)

Herkunft und Bauweg des Cores müssen ohne Vorwissen nachvollziehbar sein. Pflichtinhalte:

| Ort | Inhalt |
|---|---|
| **arc42 Kap. 7 (Verteilungssicht)**, neuer Abschnitt „Emulator-Core: Herkunft und Bauweg“ | Quelle `https://github.com/LIJI32/SameBoy`, Commit `26a56bd6a122a6318a456abd80558408742d5adf`, nur `Core/` (Dateiliste), nicht gebaut: `BootROMs/`, `iOS/`, `HexFiend/`. Image `emscripten/emsdk@sha256:cdefec94…1372` (6.0.11), Compiler-Flags, Wrapper-Pfad, Ausgabeorte, `BUILD-INFO.json`. Ablauf als Diagramm: Quelle → Docker/emcc → Artefakt im Repo → CI-Nachbau mit Hash-Vergleich → Vite-Bundle → `dist/`. Update-Prozedur Schritt für Schritt. Dasselbe für die Boot-ROM (RGBDS v1.0.4, SHA-256) |
| **arc42 Kap. 8 (Querschnitt)** | 8.5 Lizenzprüfung um Komponenten außerhalb von npm erweitert. Neuer Abschnitt „Reproduzierbare Artefakte“ (Core, Boot-ROM, Logo-Hash). 8.7 „Eine Prüfquelle“ mit Ausnahme Core-Nachbau |
| **arc42 Kap. 5 (Bausteinsicht)** | Emulator-Adapter, Audio, Storage, Session, vier Views. Umsetzungsstand M1 |
| **arc42 Kap. 4 (Lösungsstrategie)** | Hardware-Treue: eigene Boot-ROM, Direktstart, „Hardware-nah“ per Hash |
| **arc42 Kap. 9** | ADR-0004 und ADR-0006 akzeptiert, ADR-0005 mit Nachtrag. Offene Punkte aktualisiert |
| **ADR-0006** | Entscheidung SameBoy mit Spike-Tabelle (research.md R1), Bauweg Option A (R2), Lizenzprüfung (R3) |
| **ADR-0004** | Boot-ROM-Strategie, Endzustand, DIV-Zeitfenster, Hash-Prüfung, Abweichung zum Original (R4–R6) |
| **`third_party/sameboy.md`, `third_party/emscripten.md`** | Quelle, Version, Commit/Digest, Lizenz (aus LICENSE gelesen), übernommene Teile, eigene Änderungen (keine am Core, nur Wrapper), Verweis auf ADR-0006 |

## Umsetzungsreihenfolge (Grobplanung für `/speckit-tasks`)

1. **Werkzeuge und Nachweise**: `fetch-rgbds`, `build-core.sh`, CI-Job `core-reproducible`, Lizenzskripte
   erweitert, `third_party/sameboy.md` + `emscripten.md` + `THIRD_PARTY_LICENSES` im selben Commit wie das
   erste Artefakt. ADR-0006, arc42 Kap. 7/8
2. **Core-Adapter**: `wrapper.c` (Init, Frame, Bild, Ton, Tasten, Batterie, Dirty Pages), `sameboy-emulator.ts`
   gegen `EmulatorPort`, Determinismus- und MBC-Tests mit Test-ROMs
3. **Boot-ROM**: Byte-Budget-Spike, `dmg-boot.asm`, Pan-Docs-Fixture, Boot-Zustandstests (beide
   Checksummen-Fälle), DIV-Abgleich, Direktstart im Wrapper, Übergabe-Äquivalenz- und Modi-Test,
   „Hardware-nah“ mit Logo-Hash. ADR-0004, ADR-0005-Nachtrag
4. **Verträge erweitern**: `screen`, DomainEvents, ViewActions, `SessionState`, `LayoutState.maximizedSlot`,
   Typ- und Vertragstests
5. **Persistenz und Session**: `RomStorePort` + IndexedDB-Adapter, Einstellungen, `emulator-session.ts`
   (Laden, Ersetzen, Spielstand, Pause bei Hintergrund)
6. **Ton**: `AudioOutputPort`, AudioWorklet, Freigabe, Stumm/Lautstärke, Fade bei Pause, Kanal-Test
7. **Raster**: Pro-Slot-Frame-Quelle (SC-006), View-Wechsel, Zoom, Layout-Persistenz
8. **Views**: Screen (+ E-Ink-Modus), Controller, ROM Info, Memory Map
9. **E2E und Abnahme**: Playwright-Szenarien, Gerätetests, `docs/abnahme/m1.md`, arc42 Kap. 4/5/9,
   `CLAUDE.md` (Befehle, Ausnahme bei `check`), Versionssprung 0.3.0 bei Abnahme

## Offene Punkte für den Projektinhaber

1. ~~VRAM nach dem Boot~~ **entschieden (PI)**: Die Boot-ROM löscht das VRAM vor der Übergabe, der
   Direktstart setzt es auf 0 (research.md R6, ADR-0004).
2. ~~US5-AS4~~ **entschieden (PI)**: Normalmodus ist Standard, E-Ink-Modus als Schalter (pro Gerät
   gespeichert). Spec US5-AS4 und Assumptions wurden angepasst. Ursprüngliche Fassung:
   **„im E-Ink-Theme ist der E-Ink-Modus voreingestellt“**: M1 hat nur **ein** Theme, das schon
   E-Ink-first ist. Eine Voreinstellung „immer E-Ink-Modus“ würde den Screen auf Handys drosseln. Vorschlag:
   Der Normalmodus ist Standard, US5-AS4 gilt erst, wenn es einen Theme-Schalter gibt (späterer
   Meilenstein). Das erfordert eine kleine Spec-Änderung. Entscheidung vor `/speckit-tasks`.
3. Nicht blockierende Prüfpunkte: siehe [research.md](research.md), Abschnitt „Offene Punkte“.

## Complexity Tracking

| Abweichung | Warum nötig | Einfachere Alternative verworfen, weil |
|---|---|---|
| Binärartefakt (WASM) im Repo | `npm run dev/build` ohne emsdk **(PI)** | Nur-CI-Build zwingt alle zu Docker. Herkunft wird über Nachbau-Check gesichert |
| Zugriff auf SameBoy-Interna (`GB_INTERNAL`) im Wrapper | Direktstart muss den exakten Übergabezustand der eigenen Boot-ROM setzen (FR-010) | Nur öffentliche API: Im Spike wichen die Modi ab. Core-Patch wäre eine veränderte Fremdkomponente |
| Docker-Nachbau außerhalb von `npm run check` | Lokaler Check ohne Docker **(PI)** | Docker in jedem lokalen Check wäre schwer und langsam |
