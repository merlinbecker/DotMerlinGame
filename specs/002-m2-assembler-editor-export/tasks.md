---

description: "Task list for M2 – Assembler, Editor, Export"
---

# Tasks: M2 – Assembler, Editor, Export

**Input**: Design documents from `specs/002-m2-assembler-editor-export/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Pflicht laut Constitution VIII. Testaufgaben stehen vor der Umsetzung und müssen zuerst fehlschlagen. Tests
nie abschwächen oder auskommentieren.

**Organization**: Nach User Stories (US1–US5 aus spec.md, nach Priorität). Alle Pfade relativ zum Repo-Root.

**Allgemeine Regeln für jede Aufgabe**:
- Code, Bezeichner, Kommentare und Commits auf Englisch, Doku auf Deutsch, UI-Texte Englisch im Code.
- **Tokens**: Keine Literalwerte für Farben, Abstände, Schriftgrößen und Zeiten außerhalb von
  `src/app/theme/tokens.css`. Kein `transition`, `animation` oder `:hover`. Bedeutung nie nur durch Farbe.
- **Zugriffsgrenze**: Views lesen nur `context.project`, `context.session`, `context.frameState` und
  `context.events`. Sie ändern alles nur per `dispatch`. RGBDS, CodeMirror und fflate werden nur unter
  `src/adapters/` importiert (ESLint-Regel erweitern, falls sie das nicht schon prüft).
- **Keine Fakten aus dem Gedächtnis**: Optionen der Werkzeuge aus der RGBDS-Doku v1.0.4, Hardware-Werte aus Pan Docs,
  Lizenzen aus der LICENSE-Datei.
- **Versionsnummer**: Jeder Commit mit Codeänderung erhöht die Patch-Stelle in `package.json` um eins (Stand `0.4.0`).
  Reine Doku-Commits ändern sie nicht. Die Abnahme von M2 setzt `0.5.0`.
- **Fremdkomponenten**: Eintrag in `third_party/` und `THIRD_PARTY_LICENSES` im selben Commit wie die Übernahme.
  Nach Änderungen an `dependencies` läuft `npm run licenses:generate`.
- **Generierte Dateien**: `generated/` nie von Hand bearbeiten.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelisierbar (andere Dateien, keine offenen Abhängigkeiten)
- **[Story]**: zugehörige User Story

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: RGBDS reproduzierbar bauen und die Lizenzfragen vor jeder Auslieferung klären

- [ ] T001 Write `scripts/build-assembler.sh` modeled on `scripts/build-core.sh`: clone `https://github.com/gbdev/rgbds` at
  commit `f7b8207322aa9e3714ef0d98d01989f320103026` (v1.0.4) to `.build/rgbds`, then in the emsdk image pinned in
  `scripts/build-core.sh` generate `src/asm/parser.cpp` and `src/link/script.cpp` with `src/bison.sh` and build `rgbasm`,
  `rgblink` and `rgbfix` with the flags of research.md R1, plus `-I src/asm -I src/link`. Source lists come from the
  `Makefile` variables `common_obj`, `rgbasm_obj`, `rgblink_obj`, `rgbfix_obj`. Fail hard unless `bison --version` reports
  3.8.2. If the image cannot provide that version, generate the parser in a second image pinned by digest and record
  this in research.md R3 (open point 2). Output: `src/adapters/assembler/rgbds/generated/` with the `.mjs` and `.wasm`
  files and `BUILD-INFO.json` (commit, image, bison version, flags, SHA-256).
- [ ] T002 Add `"assembler:build"` and `"assembler:verify"` to `package.json` (same pattern as `core:build` and `core:verify`),
  run the build twice and confirm identical artifacts, and add a CI job `assembler-reproducible` to the workflow in
  `.github/workflows/` next to `core-reproducible`. Add both commands to the command list in `CLAUDE.md`.
- [ ] T003 Determine which runtime libraries the C++ link pulls in (emcc linker output, e.g. `EMCC_DEBUG` or `-v`) and read
  their license files inside the image. Record the result in `third_party/emscripten.md` and
  `third_party/licenses/`. Closes open point 1 of research.md. **Stop and ask the project owner** if any license is not on
  the allowlist of `scripts/check-licenses.ts`.
- [ ] T004 Write `docs/adr/0011-rgbds-wasm-und-bison.md` (German, from `docs/adr/0000-template.md`): own build instead of
  a package or rgbds-live, the owner's decision of 2026-10-30, the Bison special exception quoted verbatim from the
  generated `parser.cpp`, no `rgbgfx`, consequences. Create `third_party/rgbds.md` with front matter per
  `third_party/README.md`, `third_party/licenses/rgbds-LICENSE` verbatim, and run `npm run licenses:generate`. Commit
  T001–T004 together with the artifacts.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Verträge, Assembler-Adapter, Projektmodell und Speicher. **Keine Story-Arbeit vor Abschluss dieser Phase.**

### 2a – Verträge (contracts/)

- [ ] T005 Extend `tests/contract/` type tests: the new `ViewAction`s of `contracts/view-contract.md`, nullable `file` and
  `line` plus `tool` on `Diagnostic`, `Project.settings`, `StorageFailed.operation` including `'save-project'`.
- [ ] T006 Implement them in `src/core/ports/assembler.ts`, `src/core/ports/project-store.ts`, `src/core/ports/archive.ts`,
  `src/core/view/view-actions.ts`, `src/core/events/domain-events.ts`, and export from `src/core/index.ts`. Add `ProjectSettings`
  and `ProjectState` in `src/core/project/model.ts` and change `ProjectStateSource` in `src/core/view/view-contract.ts`
  to return `ProjectState`. Update `createIdleServices` in `src/app/services.ts`. New actions are ignored in
  `src/app/session/emulator-session.ts` until their tasks.

### 2b – Projektmodell (data-model.md)

- [ ] T007 [P] Write `tests/unit/project-model.test.ts`, then implement `src/core/project/model.ts` validation: `name` "nicht
  leer, höchstens 64 Zeichen"; `files` "mindestens eine Datei, Pfade eindeutig"; `entry` "muss in `files` liegen"; start values
  `entry: 'main.asm'`, `mbc: 'ROM_ONLY'`, `ramSize: 0`, `title` from the shortened project name (limit per RGBDS docs).
- [ ] T008 [P] Write `tests/unit/project-paths.test.ts`, then implement `src/core/project/paths.ts` `isSafePath`: rejects `..`
  segments, leading `/`, `\`, drive letters, NUL and empty segments (research.md R7).

### 2c – Assembler-Adapter (contracts/ports.md, research.md R4, R5)

- [ ] T009 [P] Build a fixture set from real tool output in `tests/assembler/fixtures/`: syntax error, include chain,
  macro, `REPT`, linker error without location, rgbfix warning. Check whether `rgblink` and `rgbfix` accept `--color` and record
  the result in research.md R5 (open point 3). Write `tests/unit/build-diagnostics.test.ts` against the set.
- [ ] T010 Implement `src/core/build/diagnostics.ts`: innermost file from the first `at file(line)` line, `<-` lines are context,
  `file: null` and `line: null` without a location, no color codes, `tool` set. T009 must be green.
- [ ] T011 Write `tests/assembler/rgbds.test.ts` (node environment): `tests/roms/src/pattern.asm` built via the adapter core is
  byte-identical to the native build from `.tools/rgbds` with the same options; results contain ROM, `.sym` and `.map`
  (FR-003); multiple files and subdirectory includes; `INCBIN` of a binary file; a source error gives `success: false`, no
  `rom`, and no rejection; logo `$0104–$0133` and checksum `$014D` are valid (via `parseHeader`, FR-006).
- [ ] T012 Implement `src/adapters/assembler/rgbds/pipeline.ts` (environment-independent: fresh module instance and MEMFS
  per tool, arguments per `contracts/ports.md` rule 1, stops at the first failing stage). T011 must be green.
- [ ] T013 Implement `src/adapters/assembler/rgbds/rgbds.worker.ts` and `src/adapters/assembler/rgbds/rgbds-assembler.ts`
  (`AssemblerPort`): `prepare()` starts the worker and compiles all three modules; a second prepared worker stands by; time
  limit 10 s with `terminate()` and `timedOut: true`; the stand-by worker takes over. Pass `WebAssembly.Module`s so no fetch is
  needed during a build.
- [ ] T014 Write `tests/e2e/m2-assembler.spec.ts` for the browser path through a test seam in the app: endless `REPT` ends after
  10 s with the UI responsive, the next build succeeds; with `context.setOffline(true)` after load, build works, also after a timeout.

### 2d – Speicher (research.md R9)

- [ ] T015 [P] Extract the reopen logic of `src/adapters/storage/indexeddb-rom-store.ts` to
  `src/adapters/storage/idb.ts`, with the existing ROM store tests staying green.
- [ ] T016 Write `tests/unit/project-store.test.ts` with the same IndexedDB test approach as the ROM store, then implement
  `src/adapters/storage/indexeddb-project-store.ts`: database name from `PROJECT_NAME`, `list`, `load`, `save`, `remove`, binary
  content kept byte for byte, `StorageFullError` on quota errors.

### 2e – Project Session

- [ ] T017 Write `tests/unit/project-session.test.ts`, then implement `src/app/session/project-session.ts` with fakes for
  store and assembler: `EditFile` updates `ProjectState` synchronously; autosave 1 s after the last change and at once on
  `visibilitychange` to hidden and on `pagehide`; `saveState` `saved | pending | failed`; on full storage the text stays,
  `StorageFailed` with `'save-project'` is published and `saveState` is `failed`.
- [ ] T018 Wire the session in `src/app/main.tsx`: route project actions to it, call `assembler.prepare()` at app start,
  create `src/app/views/m2-views.ts` and register it next to `M1B_VIEWS`. Extend `DEFAULT_VIEW_ORDER` in
  `src/app/layout/layout-store.ts` with `'editor', 'build', 'project'`, and update `tests/unit/layout-store.test.ts`. The default
  slot layout stays unchanged.

**Checkpoint**: Ein Build läuft im Worker, Projekte werden gespeichert. Views können beginnen.

---

## Phase 3: User Story 1 – Quelltext schreiben, bauen und ausführen (Priority: P1) 🎯 MVP

**Goal**: Projekt aus dem Beispiel, Quelltext ändern, bauen, im Screen sehen, Fehler führen zur Zeile.

**Independent Test**: Beispiel anlegen, bauen, es läuft. Einen Fehler einbauen, die Meldung führt zur richtigen Zeile.

- [ ] T019 [P] [US1] Write `examples/hello/main.asm`, `examples/hello/hardware.inc` (own constants named after Pan Docs with a
  source comment, not the third-party file), `examples/hello/project.json` and `examples/hello/LICENSE` (MIT). Shows a visible
  picture, reacts to a button and uses an `INCLUDE`. Must use only own code.
- [ ] T020 [P] [US1] Write `tests/assembler/example.test.ts`: `examples/hello` builds without warnings, has a valid header, runs
  300 frames in the adapter and produces more than one shade (SC-001); identical with own boot ROM and direct start (Constitution VII).
- [ ] T021 [US1] Write `tests/unit/emulator-session.test.ts` (extend): `RunBuild` loads the ROM without calling `romStore.replace`,
  no Replace prompt is involved, `saveBattery` does not write while the run source is `build`, a later `StartStoredRom` still
  has the original save game (research.md R8). Implement the run source in `src/app/session/emulator-session.ts`.
- [ ] T022 [US1] Write `tests/unit/project-session.test.ts` (extend), then implement `Build`, `RunBuild`, `GoToDiagnostic` and
  `NewProjectFromExample` in `src/app/session/project-session.ts`: `build` states `idle → running → finished | failed | timed-out`,
  "Während `running` ist ein neuer Build gesperrt", `buildIsStale` after an edit, `BuildFinished` with counts, `ProjectChanged` on open
  and not on every keystroke. A successful build starts the ROM (US1-AS1); rebuilding replaces the run without an app reload (US1-AS4).
- [ ] T023 [P] [US1] Write `tests/unit/editor-highlight.test.ts`, then implement `src/core/build/highlight.ts`: line tokenizer for
  instruction, label, comment and number; strings do not start comments. Instruction list from the RGBDS `gbz80(7)` docs.
- [ ] T024 [US1] Implement `src/adapters/editor/SourceEditor.tsx` with CodeMirror (`drawSelection({ cursorBlinkRate: 0 })`, `history`,
  `lineWrapping`, highlight decorations with CSS classes), and add the packages from research.md R6 to `dependencies` with `npm run
  licenses:generate`. External text changes update the document without moving another editor's cursor (contract rule 4); `cursorTarget`
  moves to the line. Test in `tests/unit/source-editor.test.tsx`.
- [ ] T025 [US1] Write `tests/unit/view-editor.test.tsx`, then create `src/views/editor/definition.ts` (`typeId: 'editor'`, title
  "Editor", state `{ page }`, header action `Build`) and `src/views/editor/EditorView.tsx` with file selection, `SourceEditor`,
  save status as text; "Der Editor öffnet nur gültiges UTF-8", other files show a notice. "No project" notice without a project.
- [ ] T026 [US1] Write `tests/unit/view-build.test.tsx` using `tests/support/dispatch-spy.ts`, then create `src/views/build/definition.ts`
  and `src/views/build/BuildView.tsx`: status, paged diagnostics with severity as text, tapping dispatches `GoToDiagnostic`, the note
  "Open the Editor view" without a visible editor, "Source changed since this build", `Run`, `durationMs`.
- [ ] T027 [US1] Create a minimal `src/views/project/definition.ts` and `src/views/project/ProjectView.tsx` with "New project from example",
  and register all three views in `src/app/views/m2-views.ts`.
- [ ] T028 [US1] Write `tests/e2e/m2-build-run.spec.ts`: from example, build, screen frames advance and `BuildFinished` is reflected; edit,
  rebuild, new version runs; broken line gives a message with file and line, tapping moves the editor there (SC-004); `.sym` and
  `.map` exist in the result; the stored ROM from M1 is unchanged after a build run.

**Checkpoint**: Der zentrale Ablauf Assemblieren → Emulieren funktioniert.

---

## Phase 4: User Story 2 – Hardware-taugliches `.gb` exportieren (Priority: P1)

**Goal**: Download einer gültigen `.gb`, gesperrt ohne erfolgreichen Build.

**Independent Test**: Export des Beispiels, Logo und Checksumme automatisch prüfen.

- [ ] T029 [P] [US2] Write `tests/unit/project-session.test.ts` (extend) for `ExportRom`: delivers the last successful ROM through a
  `FileSaver` port; does nothing and keeps the reason without a successful build.
- [ ] T030 [US2] Add `FileSaver` in `src/core/ports/file-saver.ts` and `src/adapters/download/anchor-file-saver.ts` (object URL with
  download attribute), then implement `ExportRom` in `src/app/session/project-session.ts`. The file name comes from the project name.
- [ ] T031 [US2] Add `Export .gb` to `src/views/build/BuildView.tsx`, disabled with a text reason (US2-AS3). Extend `tests/unit/view-build.test.tsx`.
- [ ] T032 [US2] Write `tests/e2e/m2-export.spec.ts`: Playwright download of the example; logo equals the reference via
  `src/core/rom/logo-hash.generated.ts`, checksum valid; export disabled after a failed build.

---

## Phase 5: User Story 3 – Projekte speichern, als ZIP sichern und wiederherstellen (Priority: P2)

**Goal**: Autosave über Neustart, verlustfreier ZIP-Rundlauf, sichere Ablehnung.

**Independent Test**: Exportieren, löschen, importieren, Build ist byte-identisch.

- [ ] T033 [P] [US3] Write `tests/unit/archive-zip.test.ts`: round trip including binary files; rejection reasons of `contracts/ports.md`
  for `../`, no `project.json`, unknown `formatVersion`, duplicate paths, more than 1000 entries, more than 16 MiB unpacked, and an entry with a **forged size in its
  headers** (the case from research.md R7, built in the test without committing a file); no partial result.
- [ ] T034 [US3] Add `fflate` to `dependencies` (`npm run licenses:generate`), and implement `src/adapters/archive/fflate-archive.ts` with
  streaming and a running byte counter that aborts at the limit. T033 must be green. Write `docs/adr/0012-editor-und-zip.md`
  (German): CodeMirror 6 by the owner's decision, fflate, the limits and why declared sizes are not trusted.
- [ ] T035 [US3] Write `tests/unit/project-session.test.ts` (extend), then implement `ExportZip`, `ImportZip`, `ResolveImport`, `OpenProject`
  and `DeleteProject` in `src/app/session/project-session.ts`: same name asks `replace` or `copy` (US3-AS4), a copy gets a new `id`, a rejected archive
  leaves all projects unchanged (US3-AS3), import writes nothing before validation succeeds.
- [ ] T036 [US3] Complete `src/views/project/ProjectView.tsx` with `tests/unit/view-project.test.tsx`: paged project list, open, delete with
  confirmation, export, import with the hidden file input pattern of `src/views/rom-info/RomInfoView.tsx`, rejection reason as text.
- [ ] T037 [US3] Write `tests/e2e/m2-zip.spec.ts`: edit, reload, text is kept (US3-AS1); export, delete, import, rebuild, ROM byte-identical
  (SC-002); conflict prompt; invalid ZIP rejected; a view content switch keeps unsaved text.

---

## Phase 6: User Story 5 – Quelltext auf Handy und E-Ink bearbeiten (Priority: P2)

**Goal**: Hervorhebung ohne Farbe, kein Blinken, Blättern, Zoom.

**Independent Test**: Graustufen-Screenshot, Blättern und Zoom bedienen.

- [ ] T038 [P] [US5] Add tokens to `src/app/theme/tokens.css` if needed and `src/adapters/editor/SourceEditor.module.css`: instruction bold,
  comment italic, label underlined, number dotted underline, all without color, using `--font-family-mono` and `--font-size-mono-min`.
- [ ] T039 [US5] Write `tests/unit/editor-paging.test.ts`, then implement `src/adapters/editor/paging.ts` and connect `Pager` from
  `src/views/inspect-common/Pager.tsx`: `overflow: hidden` on the scroller, one page per step, no animated scrolling, page count from visible
  height with wrapped lines, and the cursor stays visible when the on-screen keyboard shrinks the slot.
- [ ] T040 [US5] Write `tests/e2e/m2-eink.spec.ts`: for Editor, Build and Project `motionProblems` and `nonGrayColors` are empty; no blink
  animation on the cursor; the four token types differ by computed style in a grayscale screenshot; next page moves exactly one page;
  zoom via the header fills the grid, double-tap in the text does not zoom; no horizontal scrolling at 360 × 640 and 412 × 915.

---

## Phase 7: User Story 4 – Mit einem Beispielprojekt starten (Priority: P3)

**Goal**: Einstieg ohne Vorwissen.

**Independent Test**: Ohne Projekte neu aus Beispiel anlegen, bauen, ausführen.

- [ ] T041 [US4] Load `examples/*` in `src/app/session/examples.ts` through a Vite raw glob (works offline, in the main bundle), and test in
  `tests/unit/examples.test.ts` that every example passes the project model validation and that a second creation gets its own `id` and a unique name.
- [ ] T042 [US4] Write `tests/e2e/m2-example.spec.ts` with empty storage: the Project view offers the example, it builds unchanged and runs
  (US4-AS1); the Editor view without a project points to the Project view.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T043 [P] Update arc42 (German): `docs/arc42/04-*`, `05-bausteinsicht.md`, `07-verteilungssicht.md` (provenance and build of RGBDS as in 7.3), `08-querschnittliche-konzepte.md` (build pipeline, offline limit, ROM only as build result), `09-architekturentscheidungen.md` (ADR-0011, ADR-0012). Check `src/adapters/README.md` and `src/views/README.md`.
- [ ] T044 [P] Update `CLAUDE.md` commands and `examples/` note only if something changed beyond T002; make `npm run check` cover the new tests.
- [ ] T045 Run `specs/002-m2-assembler-editor-export/quickstart.md`: `npm run check`, `npm run assembler:verify`, `npm run core:verify`.
- [ ] T046 Create `docs/abnahme/m2.md` with a table of all FR and SC, each with evidence, including the offline limit of research.md R4.
- [ ] T047 Device tests per quickstart "Manuelle Prüfungen am Gerät": SC-003 on the smartphone, FR-009 on Boox Palma and Go Color 7, SC-006 on real hardware if available. Record device data in `docs/abnahme/m2.md`. Close open points 4 and 5 of research.md.
- [ ] T048 On acceptance by the project owner, set `0.5.0` in `package.json` and mark the status in `specs/002-m2-assembler-editor-export/spec.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → User Stories → **Polish (Phase 8)**
- T003 muss vor jeder Auslieferung erledigt sein; bei einer unzulässigen Lizenz stoppt M2.
- Innerhalb Phase 2: T005 → T006; T009 → T010 → T012 → T013 → T014; T011 → T012; T015 → T016; T006, T007, T016 → T017 → T018

### User Story Dependencies

- **US1**: nach Phase 2. MVP.
- **US2**: nach US1 (Build-View und Build-Ergebnis).
- **US3**: nach Phase 2; der E2E-Test T037 nutzt Editor und Build aus US1.
- **US5**: nach T024 und T025 aus US1.
- **US4**: nach T019, T022, T027 aus US1.

### Within Each User Story

Tests zuerst, dann reine Module, dann Session, dann Views, zuletzt E2E.

### Parallel Opportunities

- Phase 2: T007, T008, T009 und T015 parallel
- US1: T019, T020, T023 parallel
- US2 und US3 parallel, sobald US1 fertig ist; `project-session.ts` dann nacheinander mergen
- Polish: T043, T044 parallel

## Parallel Example: User Story 1

```text
Task: "Write examples/hello/ with own constants"
Task: "Write tests/assembler/example.test.ts"
Task: "Write tests/unit/editor-highlight.test.ts and src/core/build/highlight.ts"
```

## Implementation Strategy

### MVP First (US1)

1. Phase 1 und 2, inklusive Lizenzbeleg und reproduzierbarem Bau
2. US1 → Quelltext, Build, Lauf
3. **Stop und prüfen**: `npm run check`, Build auf einem echten Gerät

### Incremental Delivery

1. US2 → Export
2. US3 → Speichern und ZIP
3. US5 → E-Ink-Feinschliff
4. US4 → Einstieg
5. Polish → arc42, Gerätetests, Abnahme, Version `0.5.0`
