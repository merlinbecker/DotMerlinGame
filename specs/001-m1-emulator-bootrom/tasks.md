---

description: "Task list for M1 – Emulator-Kern und eigene Boot-ROM"
---

# Tasks: M1 – Emulator-Kern und eigene Boot-ROM

**Input**: Design documents from `specs/001-m1-emulator-bootrom/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Pflicht laut Constitution VIII. Testaufgaben stehen vor der jeweiligen Umsetzung und müssen
zuerst fehlschlagen. Tests nie abschwächen oder auskommentieren.

**Organization**: Nach User Stories gruppiert (US1–US8 aus spec.md, nach Priorität sortiert). Alle Pfade
relativ zum Repo-Root.

**Allgemeine Regeln für jede Aufgabe**:
- Code, Bezeichner, Kommentare und Commits auf Englisch, Doku auf Deutsch, UI-Texte Englisch im Code.
- Keine Literalwerte für Farben, Abstände und Zeiten außerhalb von `src/app/theme/tokens.css`. Kein
  `transition`, `animation` oder `:hover`. Ausnahme ist nur der Spielinhalt im Screen-Canvas.
- **Keine Hardware-Werte aus dem Gedächtnis**: Register, Adressen, Header-Codes, Bildrate und
  Checksummenformel stammen aus Pan Docs (`gbdev/pandocs`, CC0). Bei jeder Konstante steht ein
  Quellkommentar mit Seitenname.
- **Versionsnummer**: Jeder Commit mit Codeänderung erhöht die Patch-Stelle in `package.json` um eins. Reine
  Doku-Commits ändern sie nicht. Die Abnahme von M1 setzt die Version auf `0.3.0`.
- Generierte Dateien (`generated/`, `*.generated.ts`) nie von Hand bearbeiten, nur über ihr Skript.
- Festgelegte Werte (SameBoy-Commit, emsdk-Digest, RGBDS-Version und -SHA-256) genau wie in
  [contracts/build-pipeline.md](contracts/build-pipeline.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelisierbar (andere Dateien, keine offenen Abhängigkeiten)
- **[Story]**: zugehörige User Story

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Werkzeuge, Ignore-Regeln, Testkonfiguration

- [X] T001 Extend `.gitignore` with `.tools/`, `.build/`, `tests/roms/build/` and extend `tests/tooling/gitignore.test.ts` to assert these entries plus that `src/adapters/emulator/sameboy/generated/` and `src/adapters/emulator/bootrom/generated/` are **not** ignored
- [X] T002 [P] Write `tests/tooling/fetch-rgbds.test.ts` for `verifySha256(buffer, expected)` and `rgbdsPaths(root)` from `scripts/fetch-rgbds.ts` (matching hash passes, mismatching hash throws, paths point to `.tools/rgbds/rgbasm|rgblink|rgbfix`)
- [X] T003 Implement `scripts/fetch-rgbds.ts`: download `https://github.com/gbdev/rgbds/releases/download/v1.0.4/rgbds-linux-x86_64.tar.xz`, verify SHA-256 `3e19e50ea602e316be709160acaf0a708b1fa6d32d219ec541f244442895dbb7`, extract to `.tools/rgbds/`, skip if binaries exist with matching version (`rgbasm -V`), fail with a clear message on non-Linux-x86_64; add npm script `tools:rgbds` in `package.json`
- [X] T004 [P] Update `vitest.config.ts`: include `tests/emulator/**/*.test.ts` and `tests/boot-state/**/*.test.ts`; emulator and boot-state tests run in environment `node` (per-file `// @vitest-environment node` header or `environmentMatchGlobs`)
- [X] T005 [P] Update `eslint.config.js`: ignore `**/generated/**` and `**/*.generated.ts` for linting; add a `no-restricted-imports` rule so `src/adapters/emulator/sameboy/generated/**` may only be imported from `src/adapters/emulator/sameboy/sameboy-emulator.ts`; keep the existing core/views rules
- [X] T006 [P] Add devDependency `fake-indexeddb` (exact version, latest at least 2 weeks old) after reading its LICENSE file in `node_modules` (must pass `scripts/license-policy.ts` dev rules); commit `package-lock.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core als WASM mit Herkunftsnachweis, Test-ROM-Kette, erweiterte Verträge, Eventkanäle,
View-Infrastruktur. **Keine Story-Arbeit vor Abschluss dieser Phase.**

### 2a – Lizenzpipeline für Komponenten außerhalb von npm (vor dem ersten Artefakt)

- [X] T007 Write tests in `tests/unit/license-policy.test.ts` (extend) for parsing `third_party/<component>.md` front matter (`name`, `version`, `license` SPDX, `licenseFile` relative path, `source`, `commit`): missing field → error, license not in the shipped allowlist (`scripts/license-policy.ts`) → error, `Expat` treated as MIT-equivalent allowed, `MIT OR NCSA` allowed via OR rule
- [X] T008 Extend `scripts/license-data.ts`, `scripts/generate-third-party.ts` and `scripts/check-licenses.ts`: read all `third_party/*.md` except `README.md`/`npm.md`, append each component's license text (from `licenseFile` under `third_party/licenses/`) to `THIRD_PARTY_LICENSES`; check fails if a component is missing from `THIRD_PARTY_LICENSES` or the text is outdated; document the front matter format in `third_party/README.md`
- [X] T009 [P] Add a Vite plugin in `build/third-party-licenses-plugin.ts` that copies `THIRD_PARTY_LICENSES` into `dist/` and register it in `vite.config.ts`; add `tests/unit/third-party-licenses-plugin.test.ts`; add a link "Licenses" in `src/app/shell/Footer.tsx` pointing to `THIRD_PARTY_LICENSES` (extend `tests/e2e/shell.spec.ts`: link present, file served)

### 2b – SameBoy-Core als WASM (ADR-0006, Option A)

- [X] T010 Write `src/adapters/emulator/sameboy/wrapper.c` exactly per [contracts/wasm-abi.md](contracts/wasm-abi.md): `GB_random_seed(SEED)` before `GB_init(GB_alloc(), GB_MODEL_DMG_B)`; RGB-encode callback returns shade index 0–3 from a 4-gray palette (disable frame blending / color correction); VBlank callback ends `dmg_run_frame`; APU sample callback into a static stereo `int16_t` buffer; write-memory callback marks dirty 256-byte pages for `$8000–$FFFF` and a battery-dirty flag for `$A000–$BFFF`; log callback discards output; battery functions via `GB_save_battery_to_buffer`/`GB_load_battery_from_buffer`; `dmg_rom_bank` via `GB_get_direct_access(GB_DIRECT_ACCESS_ROM, …, &bank)`; `dmg_set_halt_at_handoff` and handoff detection via execution callback at PC `$0100` with boot ROM finished; `dmg_reset(direct_start)` with `direct_start` first only setting `boot_rom_finished` and PC (full state follows in T063); every `GB_INTERNAL` use carries a comment
- [X] T011 Write `scripts/build-core.sh` (POSIX sh): constants `SAMEBOY_REPO=https://github.com/LIJI32/SameBoy`, `SAMEBOY_COMMIT=26a56bd6a122a6318a456abd80558408742d5adf`, `EMSDK_IMAGE=emscripten/emsdk@sha256:cdefec943f04fd4b2b2fe23b0a1a346be9fc560ef5784a83faa27dd351381372`; clone to fixed path `.build/sameboy` (mounted as `/work/.build/sameboy`), checkout the commit; run `emcc` in the image with fixed mount `/work`, user `$(id -u):$(id -g)`, `EM_CACHE=/work/.build/emcache`; sources `Core/{gb,sgb,apu,memory,mbc,timing,display,camera,sm83_cpu,joypad,save_state,random,rumble,printer,workboy}.c` + `wrapper.c`; flags `-O3 -std=gnu11 -D_GNU_SOURCE -DGB_INTERNAL -DGB_DISABLE_TIMEKEEPING -DGB_DISABLE_REWIND -DGB_DISABLE_DEBUGGER -DGB_DISABLE_CHEATS -DGB_DISABLE_CHEAT_SEARCH -DGB_VERSION="\"$SAMEBOY_COMMIT\"" -DGB_COPYRIGHT_YEAR="\"2026\"" -s MODULARIZE=1 -s EXPORT_ES6=1 -s ENVIRONMENT=web,node -s FILESYSTEM=0 -s ALLOW_MEMORY_GROWTH=1 -s EXIT_RUNTIME=0 -s EXPORT_NAME=createSameBoy` with explicit `EXPORTED_FUNCTIONS` (all `dmg_*`, `_malloc`, `_free`) and `EXPORTED_RUNTIME_METHODS` (`HEAPU8`, `HEAP16`, `HEAPU32`); also pass `-Wl,--verbose` once to a log file for T013; output `src/adapters/emulator/sameboy/generated/sameboy.mjs` + `sameboy.wasm` + `BUILD-INFO.json` (`sameboyCommit`, `emsdkImage`, `flags`, `sha256` of both outputs); add npm scripts `core:build` (`sh scripts/build-core.sh`) and `core:verify` (`core:build` then `git diff --exit-code -- src/adapters/emulator/sameboy/generated`)
- [X] T012 Write `tests/unit/build-info.test.ts`: the pinned SameBoy commit and emsdk image in `scripts/build-core.sh`, `src/adapters/emulator/sameboy/generated/BUILD-INFO.json` and `third_party/sameboy.md`/`third_party/emscripten.md` front matter are identical; SHA-256 in `BUILD-INFO.json` matches the committed files
- [X] T013 Run `npm run core:build`; determine the actually linked Emscripten system libraries from the verbose link log; read each one's LICENSE file inside the pinned image (`docker run … cat /emsdk/upstream/emscripten/system/lib/<lib>/LICENSE*`) and store texts in `third_party/licenses/`; create `third_party/sameboy.md` (source, commit, release v1.0.4, license Expat read from LICENSE, used: `Core/` file list, not built: `BootROMs/`, `iOS/`, `HexFiend/`, frontends; no core modifications, own wrapper; ADR-0006) and `third_party/emscripten.md` (emsdk 6.0.11, image digest, license `MIT OR NCSA` from LICENSE, linked system libs with their licenses); copy SameBoy `LICENSE` to `third_party/licenses/sameboy-LICENSE`; run `npm run licenses:generate`; commit artifacts + `third_party/` + `THIRD_PARTY_LICENSES` **in one commit** (Constitution VI)
- [X] T014 [P] Write `docs/adr/0006-emulator-core.md` (template `docs/adr/0000-template.md`, status akzeptiert): decision SameBoy `Core/` @ commit, spike table from research.md R1 including debug-hook rows (FR-014), build path Option A (research.md R2), license findings (R3), alternatives binjgb/wasmboy/mGBA/Gambatte/own core
- [X] T015 [P] Write arc42 `docs/arc42/07-verteilungssicht.md` new section „7.3 Emulator-Core: Herkunft und Bauweg“: source URL, commit, used/excluded directories, image digest, compiler flags, wrapper path, outputs and `BUILD-INFO.json`, flow diagram (Quelle → Docker/emcc → Artefakt im Repo → CI-Nachbau mit Hash-Vergleich → Vite-Bundle → `dist/`), step-by-step update procedure; same for the boot ROM (RGBDS v1.0.4, SHA-256, `bootrom:build`)
- [X] T016 [P] Update `docs/arc42/08-querschnittliche-konzepte.md`: 8.5 license check incl. components outside npm and `THIRD_PARTY_LICENSES` in `dist/`; new 8.8 „Reproduzierbare Artefakte“ (core, boot ROM, logo hash: committed + rebuilt + `git diff`); 8.7 „Eine Prüfquelle“ with the exception „außer Core-Nachbau (CI-Job `core-reproducible`, lokal `npm run core:verify`)“; update `CLAUDE.md` section „Befehle“ (new scripts, `check` = CI except core rebuild)
- [ ] T017 Add job `core-reproducible` to `.github/workflows/ci.yml` (same pinned `actions/checkout`/`setup-node` as job `check`, `npm ci`, `npm run core:verify`); **ask the project owner before pushing** (outward-facing action); after the first CI run confirm the CI-built hash equals the committed artifact (research.md open point 0) and note the result in `docs/arc42/07-verteilungssicht.md`

### 2c – Test-ROM-Kette und ROM-Header

- [X] T018 Write `tests/roms/src/hardware.inc` (own file, MIT): only the register/address constants the test ROMs need, each with a Pan Docs page comment (do **not** copy third-party `hardware.inc`)
- [X] T019 Write `scripts/build-test-roms.ts`: for each `tests/roms/src/*.asm` run `.tools/rgbds/rgbasm` → `rgblink` → `rgbfix -v -p 0xFF` with per-ROM header options from a manifest `tests/roms/src/roms.json` (`mbc`, `romSize`, `ramSize`, `cgbFlag`, `title`, `patch`), output `tests/roms/build/<name>.gb`; `patch` applies byte patches after `rgbfix` (broken logo, broken checksum, checksum forced to `$00` with matching header bytes); generate `src/core/rom/logo-hash.generated.ts` exporting `NINTENDO_LOGO_SHA256` (hex SHA-256 of `$0104–$0133` of a reference ROM fixed by `rgbfix`); add npm scripts `roms:build`, `pretest` (`npm run tools:rgbds && npm run roms:build`); extend `check` to fail on `git diff --exit-code -- src/core/rom/logo-hash.generated.ts`
- [X] T020 [P] Write test ROM sources in `tests/roms/src/` (all own code, MIT, documented in a header comment) with entries in `roms.json`: `boot-regs.asm` (stores registers at entry into WRAM, checksum ≠ `$00`), `boot-regs-cs00.asm` (header bytes chosen so checksum is `$00`), `mbc-none.asm`, `mbc1.asm`, `mbc3.asm`, `mbc5.asm` (each switches through all banks and writes a per-bank marker read from the bank into WRAM), `battery.asm` (ROM `mbc5-battery`) (writes a counter to cartridge RAM), `apu-ch1.asm`…`apu-ch4.asm` (each enables exactly one channel), `input.asm` (copies joypad state to WRAM each frame), `pattern.asm` (draws a deterministic pattern synced to VBlank, for display tests), `bad-logo` and `bad-checksum` variants via `patch`, `cgb-only.asm` (`cgbFlag` cgb-only per Pan Docs „The Cartridge Header“), `cgb-compatible.asm` (`cgbFlag` cgb-compatible, writes a marker so the test can prove it runs in DMG mode), `bad-cart-type` variant via `patch` (cartridge type byte set to a code not defined in the Pan Docs table)
- [X] T021 Write `tests/unit/rom-header.test.ts` for `parseHeader(bytes)` against ROMs from `tests/roms/build/` and synthetic buffers: title, `cartridgeType` `{ code, mbc: 'none' | 'mbc1' | 'mbc3' | 'mbc5' | 'other', ram, battery }`, `romSizeBytes`/`romBanks` („Bänke à 16 KiB“), `ramSizeBytes`, `cgbFlag` `'dmg' | 'cgb-compatible' | 'cgb-only'`, `headerChecksumValid`, `logoValid`; rejection rules from [data-model.md](data-model.md): too small / ROM size not matching header → `invalid`, `cgb-only` → `cgb-only`, cartridge type code not defined in the Pan Docs table → `unsupported-cartridge`; defined but unassured types (e.g. MBC2) are accepted
- [X] T022 Implement `src/core/rom/header.ts` (`parseHeader`, `validateForLoad`, `computeHeaderChecksum` per Pan Docs formula, `logoMatches` via `crypto.subtle.digest('SHA-256')` against `NINTENDO_LOGO_SHA256`); export from `src/core/index.ts`

### 2d – Verträge erweitern (Änderungen gegenüber M0)

- [X] T023 [P] Extend type tests `tests/contract/events.test-d.ts` per [contracts/events-and-frame-state.md](contracts/events-and-frame-state.md): `FrameSnapshot.screen: Uint8Array`; new `DomainEvent` variants `RomRejected`, `EmulatorHalted`, `RunStateChanged`, `StorageFailed` with exact fields; unknown `type` still a type error
- [X] T024 [P] Extend type tests `tests/contract/view-contract.test-d.ts` per [contracts/view-contract.md](contracts/view-contract.md): new `ViewAction` variants `LoadRom`, `StartStoredRom`, `SetBootMode`, `SetHardwareChecks`, `SetVolume`, `SetMuted`, `UnlockAudio`, `SetFrameRate`; `ViewContext.session: SessionStateSource`; `SessionState`, `Notice`; `ViewDefinition` optional `headerActions` (no `doubleTapZoom`, zoom is button-only); `LayoutState.maximizedSlot: number | null`
- [X] T025 Update `src/core/events/frame-state.ts`, `src/core/events/domain-events.ts`, `src/core/view/view-actions.ts`, `src/core/view/view-contract.ts` (incl. `SessionState`, `Notice`, `headerActions` as `readonly { id: string; label: string; pressed?: boolean }[]` derived from view state + `onHeaderAction(id)` mapping to a `ViewAction`), `src/core/layout/layout-state.ts` (`maximizedSlot`, `version` stays `1`), and exports in `src/core/index.ts`; update `emptyLayout` in `src/app/layout/Grid.tsx` with `maximizedSlot: null`
- [X] T026 [P] Update `src/core/ports/emulator.ts` per [contracts/ports.md](contracts/ports.md) (`readBatteryRam`, `writeBatteryRam`, `batteryRamDirty`, `setAudioSink`, `RomLoadError` with `reason: 'invalid' | 'cgb-only' | 'unsupported-cartridge'`); create `src/core/ports/audio-output.ts` (`AudioSink`, `AudioOutputPort` incl. `bufferedSamples`) and `src/core/ports/rom-store.ts` (`StoredRom`, `RomStorePort`); export all from `src/core/index.ts`

### 2e – Eventkanäle und View-Infrastruktur

- [X] T027 [P] Write `tests/unit/domain-event-bus.test.ts` and `tests/unit/frame-state-hub.test.ts`: bus delivers only matching `type`, unsubscribe works; hub honors `full`, `reduced` (`everyNthFrame ≥ 2`, else throws), `on-demand` + `requestSnapshot`, `getSnapshot` returns last published, `changedMemory` accumulates across skipped frames and is merged/sorted/non-overlapping
- [X] T028 Implement `src/core/events/domain-event-bus.ts` (`createDomainEventBus(): DomainEventBus`) and `src/core/events/frame-state-hub.ts` (`createFrameStateHub(): FrameStatePublisher & { publish(build: () => FrameSnapshot, frame: number): void; readonly hasSubscribers: boolean }`, builds snapshots lazily only when delivering)
- [X] T029 [P] Write `tests/unit/slot-frame-source.test.ts`: per-slot wrapper delivers nothing while `visible === false` (counter stays 0, SC-006), `getSnapshot` returns last delivered; `SetFrameRate` `reduced(n)` delivers every n-th upstream frame; `on-demand` only after request; reports demand so the emulator rate is `full` while any visible slot subscribes with `full`/`reduced`, else `on-demand`
- [X] T030 Implement `src/app/layout/slot-frame-source.ts` and a demand aggregator `src/app/layout/frame-demand.ts` that sets the emulator publisher rate
- [X] T031 [P] Write `tests/unit/layout-store.test.ts`: `loadLayout(slotCount)` / `saveLayout(state)` in `localStorage` under a key derived from `PROJECT_NAME`; invalid/foreign JSON → default layout (slot 0 `screen`, slot 1 `controller`, then `rom-info`, `memory-map`, then empty) without throwing; slot count change keeps contents in grid order, drops extras, resets `maximizedSlot` to `null` if invalid; `maximizedSlot` „Must point to a non-null slot“
- [X] T032 Implement `src/app/layout/layout-store.ts` and wire `src/app/layout/Grid.tsx` to load/save the layout (replace `emptyLayout` use)
- [X] T033 Create the view registry `src/app/views/registry.ts` (`typeId` → `{ definition: ViewDefinition<unknown>, Component }`) and render the assigned view in `src/app/layout/Slot.tsx` with a `ViewContext` (per-slot frame source, events, project, session, dispatch, visible from IntersectionObserver + `document.visibilityState` + maximize state); empty slots stay as in M0; add `tests/contract/view-contract.test.ts` cases for a dummy view receiving context and dispatching
- [X] T034 [P] Write `tests/unit/view-cycle.test.ts` for `src/app/layout/view-cycle.ts`: next/previous cycles through the registered views in fixed order (`screen`, `controller`, `rom-info`, `memory-map`) and wraps around (no swipe gesture)
- [X] T035 Implement `src/app/layout/view-cycle.ts`, arrow buttons in the header of `src/app/layout/SlotHeader.tsx` (no swipe gesture) (large touch targets, labels "Previous view"/"Next view"), switching updates and persists the layout immediately; emulator state and ROM are untouched (FR-013)

**Checkpoint**: WASM-Core mit Herkunftsnachweis committet, Test-ROMs bauen, Verträge erweitert, Raster kann Views rendern und per Kopfleiste wechseln.

---

## Phase 3: User Story 1 – ROM laden und spielen (Priority: P1) 🎯 MVP

**Goal**: ROM vom Gerät wählen, im Screen spielen, per Touch/Tastatur bedienen; ROM und Spielstand bleiben gespeichert.

**Independent Test**: Freies Test-ROM laden → erwartetes Bild; Eingaben wirken; nach Neuladen ohne Dateiauswahl startbar.

**Hinweis**: Bis US2 fertig ist, startet US1 im Direktstart. T068 stellt den Standard auf `own-boot-rom` um.

### Tests for User Story 1

- [X] T036 [P] [US1] Write `tests/emulator/sameboy-adapter.test.ts` (node env, ROMs from `tests/roms/build/`): `loadRom` + run N frames → `screen.length === 160 * 144`, all values in `0..3`; registers/flags consistent; `changedMemory` only within `$8000–$FFFF`; `RomLoadError` reasons for `invalid`, `cgb-only` and `unsupported-cartridge` (`bad-cart-type`) and the previous ROM keeps running after rejection; `cgb-compatible` runs in DMG mode (marker in WRAM, FR-017); `pattern` screen hash stable
- [X] T037 [P] [US1] Write `tests/emulator/determinism.test.ts`: two fresh instances, same ROM + same input sequence → identical screen hashes, registers and audio sample hashes after 300 frames
- [X] T038 [P] [US1] Write `tests/emulator/mbc.test.ts`: `mbc-none`, `mbc1`, `mbc3`, `mbc5` run and every per-bank marker in WRAM is correct (FR-001)
- [X] T039 [P] [US1] Write `tests/emulator/input.test.ts` with `input.asm`: single button and combinations (e.g. Right + A) appear in WRAM within one frame (SC-004); rapid down/up sequences within one frame are not lost (edge case)
- [X] T040 [P] [US1] Write `tests/emulator/battery.test.ts` with `mbc5-battery`: `readBatteryRam` after writes, `batteryRamDirty` toggles, `writeBatteryRam` before `run` restores the counter; ROM without battery → `readBatteryRam() === null`
- [X] T041 [P] [US1] Write `tests/unit/indexeddb-rom-store.test.ts` (fake-indexeddb) against `RomStorePort`: at most one entry; `replace` drops the old save game in the same transaction; `saveBattery`/`load` round-trip; `QuotaExceededError` surfaces as a typed error
- [X] T042 [P] [US1] Write `tests/unit/emulator-session.test.ts` with fake ports: `LoadRom` validates, stores, starts, publishes `RomLoaded` (`romId` = SHA-256 hex); rejected ROM → `RomRejected` + notice, previous run state unchanged; `StartStoredRom` restores ROM + battery; storage full → `StorageFailed` + notice `storage-full`, ROM still runs; battery saved at most every 2 s when dirty, on pause, on `visibilitychange` hidden and `pagehide`; settings persisted in `localStorage` (`bootMode` default per [data-model.md](data-model.md), `hardwareChecks` default `false`)
- [X] T043 [P] [US1] Write `tests/unit/frame-clock.test.ts` with injected time source: frames per tick from elapsed time × DMG frame rate (value from Pan Docs), max 3 catch-up frames, reset after pause/background (no time jump)

### Implementation for User Story 1

- [X] T044 [US1] Implement `src/adapters/emulator/sameboy/sameboy-emulator.ts` (`createSameBoyEmulator(): Promise<EmulatorPort>`): loads `generated/sameboy.mjs`, validates via `src/core/rom/header.ts` before touching the core, copies ROM into WASM memory, `run`/`pause`/`reset`, `setButton` → key mask, publishes snapshots via the frame-state hub (copy `screen`, read dirty pages via `dmg_peek` and merge ranges), battery API, `step`/`setBreakpoint`/`clearBreakpoint` throw `Error('not supported in M1')`
- [X] T045 [US1] Implement `src/adapters/emulator/frame-clock.ts` (rAF-driven, injected time source; audio-driven pacing hook added in T077)
- [X] T046 [US1] Implement `src/adapters/storage/indexeddb-rom-store.ts` (database name derived from `PROJECT_NAME`, one store, key `current`, `replace` in one transaction)
- [X] T047 [US1] Implement `src/app/session/settings-store.ts` (localStorage, keys derived from `PROJECT_NAME`, defaults from [data-model.md](data-model.md)) and `src/app/session/emulator-session.ts` (owns emulator, rom store, settings, domain event bus, `SessionStateSource`, `dispatch(action)` routing for `LoadRom`, `StartStoredRom`, `ButtonDown`/`ButtonUp`; run state machine `'empty' → 'running' ⇄ 'paused' → 'halted'` per data-model; battery save policy; pause on `visibilitychange` hidden and resume only if it was running)
- [X] T048 [US1] Wire the session into `src/app/main.tsx` / `src/app/shell/AppShell.tsx` (create once, provide to `Grid` → `Slot` contexts)
- [X] T049 [P] [US1] Implement view `src/views/screen/` (`definition.ts` with `typeId: 'screen'`, title `Screen`, state `{ mode: 'normal' }` serialize/deserialize; `ScreenView.tsx` draws `frameState.screen` to a canvas with integer scaling and `image-rendering: pixelated`, 4 gray shades from tokens; only reads, never touches the emulator)
- [X] T050 [P] [US1] Implement view `src/views/controller/` (`typeId: 'controller'`): D-pad, A, B, Start, Select as large touch targets (`--touch-target-min`), Pointer Events with `setPointerCapture`, multiple simultaneous pointers, `ButtonDown`/`ButtonUp` dispatch; keyboard map constant (Arrows, X=A, Z=B, Enter=Start, Shift=Select) active while the app has focus; no hover styles; write `tests/unit/controller-input.test.tsx` (multi-touch, pointer cancel releases button)
- [X] T051 [P] [US1] Implement view `src/views/rom-info/` base (`typeId: 'rom-info'`, title `ROM Info`): file picker button "Load ROM", confirmation text "Loading a new ROM replaces the stored ROM. Its save game will be lost; the ROM file itself stays on your device." before dispatching `LoadRom` when a ROM is stored, "Start stored ROM" when `runState === 'empty'` and a ROM is stored, notice display for `rejected` and `storage-full`; header data and controls follow in US8/US2/US3/US4
- [X] T052 [US1] Register `screen`, `controller`, `rom-info` via `src/app/views/m1-views.ts` and `registerViews` in `src/app/main.tsx`
- [X] T053 [US1] Write `tests/e2e/m1-load-play.spec.ts` (built app, ROMs from `tests/roms/build/`): load `pattern` via file input → canvas shows expected pixels; `input` ROM reacts to touch on the controller incl. two buttons at once; reload → "Start stored ROM" works without file selection; invalid file → notice, no crash

**Checkpoint**: US1 voll funktionsfähig und testbar (MVP).

---

## Phase 4: User Story 2 – Eigene, kompatible Boot-ROM (Priority: P1)

**Goal**: Eigene Boot-ROM mit eigenem Logo; Endzustand exakt laut Pan Docs (DMG); Direktstart identisch; „Hardware-nah“.

**Independent Test**: Automatischer Vergleich der Register nach dem Boot mit Pan Docs; beide Startmodi identisch.

### Tests for User Story 2

- [X] T054 [P] [US2] Create fixture `tests/boot-state/pan-docs-dmg.ts`: CPU registers and the full „Hardware registers“ table (column „DMG / MGB“) from Pan Docs „Power Up Sequence“ (CC0), with page URL and retrieval date; F rule: Z=1, N=0, H and C both 0 if header byte `$014D` is `$00`, else both 1; DIV `$AB` at PC `$0100`; registers marked as unknown/uninitialized in Pan Docs are excluded with a comment
- [X] T055 [US2] Replace the `it.todo` in `tests/boot-state/boot-state.test.ts`: with own boot ROM, run until handoff, compare CPU registers and every fixture I/O register for `boot-regs` (checksum ≠ `$00`) and `boot-regs-cs00` (checksum `$00`) (SC-001); also verify the boot ROM is 256 bytes and unmapped after the `$FF50` write
- [X] T056 [P] [US2] Write `tests/boot-state/handoff-equivalence.test.ts`: `dmg_handoff_state` after own boot ROM equals direct start for both checksum variants: registers, I/O, divider incl. low bits, PPU line/dot, APU, VRAM (all zero, decision A), WRAM, HRAM, OAM
- [X] T057 [P] [US2] Write `tests/emulator/modes-identical.test.ts`: for **every** ROM in `tests/roms/build/` except `bad-*`/`cgb-only` (hardware-near off), screen and audio hashes after N frames from handoff are identical in both modes (SC-002, FR-010, Constitution VII)
- [X] T058 [P] [US2] Write `tests/emulator/hardware-checks.test.ts`: `bad-logo` / `bad-checksum` with `hardwareChecks: true` → halt before the first instruction at `$0100`, `EmulatorHalted` with reason `header-logo` / `header-checksum`, in both boot modes (direct start: check before the first instruction); with `hardwareChecks: false` → runs, session notice `header-invalid`; valid ROMs never halt
- [X] T059 [P] [US2] Write `tests/boot-state/boot-logo.test.ts`: during the boot ROM the screen shows the own logo (screen hash at a fixed frame matches a committed expected hash generated from the boot ROM build), after handoff VRAM is cleared

### Implementation for User Story 2

- [X] T060 [US2] Byte-budget spike for the boot ROM (scratchpad, not committed): logo tile format, copy routine, VRAM clear, checksum, register/I/O setup, timing padding must fit `$0000–$00FF`; record the budget table and chosen logo size in `docs/adr/0004-boot-rom-strategie.md` (draft)
- [X] T061 [US2] Write `src/adapters/emulator/bootrom/dmg-boot.asm` (own code, MIT header, no bytes from Nintendo or SameBoy boot ROMs): init, own logo (derived from `public/icons/logo.svg`, reduced to 1-bpp tiles) displayed, hold time, clear VRAM, compute header checksum for F flags, set CPU and I/O registers to the fixture values, cycle-exact padding so DIV reads `$AB` at PC `$0100`, write `$FF50`; size exactly 256 bytes (assert in the build script)
- [X] T062 [US2] Write `scripts/build-bootrom.ts` (npm script `bootrom:build`): assemble with `.tools/rgbds`, verify size 256, emit `src/adapters/emulator/bootrom/generated/dmg-boot.ts` (`export const DMG_BOOT_ROM = new Uint8Array([...])`) and `BUILD-INFO.json` (RGBDS version, SHA-256); extend `check` to fail on `git diff --exit-code -- src/adapters/emulator/bootrom/generated`
- [X] T063 [US2] Complete direct start in `src/adapters/emulator/sameboy/wrapper.c`: set CPU/I/O to fixture values, F from `$014D`, VRAM zero, divider low bits / PPU position / APU state equal to the measured handoff snapshot of the own boot ROM (`GB_INTERNAL`, commented); implement `dmg_handoff_state`; rebuild with `npm run core:build`, update `third_party/sameboy.md` if anything but the wrapper changed (must not), commit artifact
- [X] T064 [US2] Extend `src/adapters/emulator/sameboy/sameboy-emulator.ts`: load `DMG_BOOT_ROM` in `own-boot-rom` mode; `hardwareChecks` → `dmg_set_halt_at_handoff(1)`, on handoff run `src/core/rom/header.ts` checks and halt + `EmulatorHalted` on failure; direct start checks before the first instruction
- [X] T065 [US2] Extend `src/app/session/emulator-session.ts`: run state `halted`, notices `halted` / `header-invalid`, `SetBootMode` and `SetHardwareChecks` (persisted, effective on next start/reset)
- [X] T066 [US2] Extend `src/views/rom-info/`: boot mode selector ("Own boot ROM" / "Direct start") and toggle "Hardware-near checks", halt reason text ("Stopped: header logo does not match" / "Stopped: header checksum is wrong"), notice "Header is invalid – a real DMG would not start this ROM."
- [X] T067 [P] [US2] Finish `docs/adr/0004-boot-rom-strategie.md` (status akzeptiert): own boot ROM, end state per Pan Docs DMG incl. F rule and DIV window, chosen cycle count, VRAM cleared before handoff (deviation from original, PI decision), hardware-near check via SHA-256 in own code at handoff (deviation: halt instead of lock-up loop), direct start reproduces the handoff state; **explicit permission to commit the own boot ROM binary** as `generated/dmg-boot.ts` (own code, MIT, no Nintendo or third-party bytes) as required by CLAUDE.md for committed ROMs; and append the M1 amendment to `docs/adr/0005-quelltext-einzige-wahrheit.md` (one ROM + save game as runtime input in `RomStorePort`, never in the project store)
- [X] T068 [US2] Switch the default `bootMode` to `'own-boot-rom'` in `src/app/session/settings-store.ts` (data-model default) and add `tests/e2e/m1-boot.spec.ts`: loading a ROM shows the own logo first, then the game

**Checkpoint**: Boot-Zustandstests (SC-001) und Modus-Gleichheit (SC-002) grün.

---

## Phase 5: User Story 4 – Ton wie auf dem DMG-01 (Priority: P1)

**Goal**: Vier Tonkanäle hörbar und synchron; Stumm/Lautstärke; Freigabe nach erster Nutzeraktion; keine Knackser.

**Independent Test**: Kanal-Test-ROMs in den Audiodaten nachweisbar; manuelle Hörprobe.

### Tests for User Story 4

- [X] T069 [P] [US4] Write `tests/emulator/audio-channels.test.ts`: `apu-ch1`…`apu-ch4` each produce non-silent samples; sample count per frame ≈ sample rate / DMG frame rate (Pan Docs value, tolerance ±2)
- [X] T070 [P] [US4] Write `tests/unit/audio-pacing.test.ts` for `src/adapters/emulator/frame-clock.ts`: with audio unlocked, frames per tick follow the buffer fill level (below target → +1, above → −1, bounded); locked/muted without output → time-based; no drift over a simulated 10 minutes (SC-007)
- [X] T071 [P] [US4] Write `tests/unit/audio-worklet-processor.test.ts` for the pure ring-buffer core `src/adapters/audio/ring-buffer.ts`: push/pull, underflow fills silence and counts, overflow drops and counts, fade-out/fade-in ramps on suspend/resume
- [X] T072 [P] [US4] Write `tests/unit/emulator-session-audio.test.ts`: `UnlockAudio` calls `unlock`; first pointer event in the app triggers unlock; `SetMuted`/`SetVolume` persist and apply immediately without touching emulation; pause/background → `suspend`, resume → `resume`; notice `audio-locked` until unlocked

### Implementation for User Story 4

- [X] T073 [US4] Implement `src/adapters/audio/ring-buffer.ts` and `src/adapters/audio/audio-worklet-processor.ts` (AudioWorkletProcessor using the ring buffer, reports fill level via `port.postMessage`)
- [X] T074 [US4] Implement `src/adapters/audio/web-audio-output.ts` (`AudioOutputPort`): `AudioContext`, worklet loaded via `new URL('./audio-worklet-processor.ts', import.meta.url)`, `GainNode` for volume/mute, samples posted per frame with transfer, no `SharedArrayBuffer`, `suspend`/`resume` with fade
- [X] T075 [US4] Connect audio in `src/adapters/emulator/sameboy/sameboy-emulator.ts` (`setAudioSink`, sample rate from sink → `dmg_init`) and in `src/app/session/emulator-session.ts` (audio settings, unlock, suspend/resume, notices)
- [X] T076 [P] [US4] Screen header mute action: `headerActions` in `src/views/screen/definition.ts` (label "Mute"/"Unmute", pressed state) dispatching `SetMuted`; render header actions in `src/app/layout/SlotHeader.tsx`
- [X] T077 [US4] Audio-driven pacing in `src/adapters/emulator/frame-clock.ts` using `AudioOutputPort.bufferedSamples`
- [X] T078 [P] [US4] Extend `src/views/rom-info/` with volume steps (0.1 steps, buttons "−"/"+", value shown as text) and the audio-locked hint "Tap anywhere to enable sound"; a "Diagnostics" text block showing frame compute time p95 (rolling 5 min, measured in `frame-clock.ts`) and audio underflow/overflow counters (from the worklet) for SC-003/SC-007
- [X] T079 [US4] Write `tests/e2e/m1-audio.spec.ts`: after first tap the `AudioContext` state is `running`; mute in the screen header sets gain to 0 immediately and the frame counter keeps increasing; hidden tab suspends

**Checkpoint**: Ton vollständig; P1-Stories abgeschlossen.

---

## Phase 6: User Story 3 – Emulator als Dienst, Views nur als Beobachter (Priority: P2)

**Goal**: Verträge im Echtbetrieb belegen; Pause/Fortsetzen/Zurücksetzen über den Aktionskanal.

**Independent Test**: Vertragstests mit Test-View; ausgeblendete Views verarbeiten 0 Updates.

- [X] T080 [P] [US3] Write `tests/emulator/service-contract.test.ts`: with the real emulator, snapshots contain registers, flags, cycles, changed memory of the current frame (US3-AS1); reducing the publish rate or `on-demand` lowers deliveries but the emulated frame count per tick stays the same (US3-AS3); `Pause`/`Resume`/`Reset` via session `dispatch` change run state and emit `RunStateChanged` (US3-AS4)
- [X] T081 [P] [US3] Write `tests/contract/hidden-view.test.tsx`: a test view in a hidden slot (and in a slot covered by a maximized slot) processes 0 frame updates while frames are published (SC-006, US3-AS2)
- [X] T082 [US3] Implement `Pause`/`Resume`/`Reset` routing in `src/app/session/emulator-session.ts` (Reset restarts in the current boot mode, save game kept) and buttons "Pause"/"Resume"/"Reset" in `src/views/rom-info/`
- [X] T083 [US3] Verify the ESLint architecture rules cover the new folders (`src/views/**` cannot import `src/adapters/**` or `src/app/session/**` internals); add a lint fixture test in `tests/tooling/` if the existing setup allows it

---

## Phase 7: User Story 5 – Spielen auf E-Ink-Geräten (Priority: P2)

**Goal**: E-Ink-Modus des Screens mit reduzierter Rate, kontrastreichem Mapping, optionalem Dithering; Emulation läuft voll weiter.

**Independent Test**: Neuzeichnungen pro Sekunde ≤ eingestellte Rate bei ~60 emulierten Frames; Graustufen unterscheidbar.

- [ ] T084 [P] [US5] Write `tests/unit/eink-render.test.ts` for pure functions in `src/views/screen/eink.ts`: `mapShades(screen, 'contrast' | 'linear')` keeps the four DMG shades distinguishable; `dither(screen)` ordered Bayer produces only black/white and preserves average brightness per 4×4 block within tolerance
- [ ] T085 [P] [US5] Write `tests/unit/screen-view-state.test.ts`: `ScreenViewState` defaults `mode: 'normal'`, `einkEveryNthFrame: 15` (allowed `4 | 6 | 15 | 30`), `einkMapping: 'contrast'`, `einkDither: false`; `deserialize(serialize(s))` equivalent; invalid JSON → defaults
- [ ] T086 [US5] Implement `src/views/screen/eink.ts` and extend `src/views/screen/`: E-Ink toggle and settings (rate, mapping, dither) as large controls inside the view, dispatch `SetFrameRate` (`reduced(einkEveryNthFrame)` in E-Ink mode, `full` otherwise), state persisted via layout `viewState`; default normal mode (US5-AS4, PI decision)
- [ ] T087 [US5] Write `tests/e2e/m1-eink.spec.ts`: E-Ink mode on → canvas redraw counter ≤ set rate while the emulator frame counter advances ~60/s (SC-008); reload keeps mode and settings (US5-AS3); fresh device starts in normal mode (US5-AS4)

---

## Phase 8: User Story 7 – Einzelnes Quadrat vergrößern (Priority: P2)

**Goal**: Slot per Zoom-Schalter in der Kopfleiste auf die ganze Fläche; zurück; gespeichert im Layout. Keine Zoom-Geste.

**Independent Test**: Vergrößern/zurück per Schalter; Inhalte bleiben; verdeckte Slots ohne Updates; Doppeltipp zoomt nicht.

- [ ] T088 [P] [US7] Write `tests/unit/layout-zoom.test.ts` for reducer functions in `src/app/layout/layout-zoom.ts`: `toggleMaximize(state, index)` on an occupied slot sets/clears `maximizedSlot`; empty slot → unchanged; `isSlotVisible(state, index)` false for slots hidden by maximize
- [ ] T089 [P] [US7] Write `tests/unit/slot-header-zoom.test.tsx` for `src/app/layout/SlotHeader.tsx`: every occupied slot header renders a zoom button (label "Maximize"/"Restore", `aria-pressed` reflects state, at least `--touch-target-min`); empty slots render none; the slot registers no double-tap/zoom gesture handler
- [ ] T090 [US7] Implement `src/app/layout/layout-zoom.ts`, zoom button in `src/app/layout/SlotHeader.tsx` (no gesture), maximized rendering in `src/app/layout/Grid.tsx` (no animation), hidden slots get `visible: false`, persistence through `layout-store`
- [ ] T091 [US7] Write `tests/e2e/m1-zoom.spec.ts`: zoom button on the screen maximizes immediately, again restores; same on the controller; double tap on any slot content does not change the size; emulation frame counter keeps running while maximized; reload keeps the maximized slot

---

## Phase 9: User Story 8 – ROM-Speicherkonzept verstehen (Priority: P2)

**Goal**: ROM Info zeigt Header-Daten; Memory Map zeigt Adressbereiche mit fester und umschaltbarer Bank.

**Independent Test**: Test-ROM laden; ROM Info zeigt erwartete Header-Werte; Memory Map zeigt Bereiche mit passender Bankzahl.

- [ ] T092 [P] [US8] Write `tests/unit/memory-map.test.ts`: `MEMORY_MAP` regions from Pan Docs „Memory Map“ are contiguous, non-overlapping, cover `$0000–$FFFF`, kinds `'rom-fixed' | 'rom-banked' | 'vram' | 'cart-ram' | 'wram' | 'echo' | 'oam' | 'unusable' | 'io' | 'hram' | 'ie'`
- [ ] T093 [US8] Implement `src/core/rom/memory-map.ts` (constant with Pan Docs source comment) and export it
- [ ] T094 [P] [US8] Extend `src/views/rom-info/` with header data from `session.rom`: title, cartridge type (code + readable name), ROM size + bank count, RAM size, battery yes/no; text "No ROM loaded" when empty (US8-AS1/AS3)
- [ ] T095 [P] [US8] Implement view `src/views/memory-map/` (`typeId: 'memory-map'`, title `Memory Map`): list of regions with start/end addresses and names; fixed bank 0 and switchable bank „Bank 1 bis n“ visually distinct by shape/pattern, not color; n from `session.rom.romBanks - 1`, without ROM no bank count; paging instead of scrolling if the list does not fit (Constitution V); register in `src/app/views/registry.ts`
- [ ] T096 [US8] Write `tests/e2e/m1-rom-info.spec.ts`: after loading `mbc5` the ROM Info shows the expected header values and Memory Map shows the matching bank count; without ROM both show the empty states

---

## Phase 10: User Story 6 – Wechsel der View-Inhalte über die Kopfleiste (Priority: P3)

**Goal**: Views über Pfeiltasten in der Kopfleiste tauschen (keine Wischgeste); Belegung bleibt erhalten.

**Hinweis**: Die Mechanik (View-Wechsel, Layout-Persistenz) ist in Phase 2 vorgezogen, weil im Hochformat nur zwei Slots existieren und „ROM Info“ schon für US1 erreichbar sein muss. Diese Phase belegt die Story end-to-end.

**Independent Test**: Slot-Inhalt wechseln, neu laden, Belegung unverändert.

- [ ] T097 [US6] Write `tests/e2e/m1-view-switch.spec.ts`: arrow tap switches the slot immediately; reload restores the assignment; running game continues during the switch

---

## Phase 11: Polish & Cross-Cutting Concerns

- [ ] T098 [P] Update `docs/arc42/05-bausteinsicht.md` (emulator adapter, audio, storage, session, slot frame source, four views; section „5.4 Umsetzungsstand M1“), `docs/arc42/04-loesungsstrategie.md` (Hardware-Treue: own boot ROM, direct start, hardware-near via hash) and `docs/arc42/09-architekturentscheidungen.md` (ADR-0004 and ADR-0006 akzeptiert, ADR-0005 amended, open points updated)
- [ ] T099 [P] Extend `tests/e2e/eink.spec.ts` for all four M1 views (`screen` chrome, `controller`, `rom-info`, `memory-map`): computed styles grayscale only, no running animations/transitions, touch targets ≥ `--touch-target-min`, no `:hover` rules; the game canvas content of the screen view is excluded (FR-016)
- [ ] T100 [P] Update `CLAUDE.md` „Befehle“ with the final scripts (`tools:rgbds`, `roms:build`, `bootrom:build`, `core:build`, `core:verify`) and `third_party/README.md` with the new components
- [ ] T101 Run `npm run check` and `npm run core:verify`; fix until green without weakening tests
- [ ] T102 Manual device acceptance per [quickstart.md](quickstart.md) „Manuelle Prüfungen am Gerät“ (mid-range Android phone, E-Ink device): SC-003 (frame time p95 < 16.7 ms from ROM Info diagnostics), SC-004, SC-005, SC-007 (10 min, underflow/overflow counters = 0), SC-008; record device, Chrome version and results in `docs/abnahme/m1.md`
- [ ] T103 Re-check Constitution gates in [plan.md](plan.md) and every acceptance scenario of [spec.md](spec.md) against the built result; on acceptance set `package.json` version to `0.3.0`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → User Stories → **Polish (Phase 11)**
- Innerhalb von Phase 2: 2a (Lizenzpipeline) vor T013 (erster Artefakt-Commit); T010 → T011 → T013; T018 → T019 → T020 → T021/T022; T023/T024 → T025/T026 → T027–T035 (View-Wechsel T034/T035 vor allen E2E-Tests der Stories)
- **US1** (Phase 3): nach Phase 2 – MVP
- **US2** (Phase 4): nach US1 (braucht Adapter T044 und Session T047)
- **US4** (Phase 5): nach US1; unabhängig von US2
- **US3** (Phase 6): nach US1
- **US5** (Phase 7): nach US1 (Screen-View)
- **US7** (Phase 8): nach Phase 2; e2e nach US1
- **US8** (Phase 9): nach US1 (ROM Info Basis)
- **US6** (Phase 10): Mechanik schon in Phase 2 (T034/T035); E2E nach US1

### Within Each User Story

- Tests zuerst schreiben und fehlschlagen lassen, dann umsetzen
- Core-Logik vor Adapter, Adapter vor Session, Session vor Views, Views vor E2E
- Jede Änderung an `wrapper.c` erfordert `npm run core:build` und das Committen des Artefakts im selben Commit

### Parallel Opportunities

- Phase 1: T002, T004, T005, T006 parallel
- Phase 2: T014, T015, T016 parallel nach T013; T023, T024 parallel; T027, T029, T031, T034 parallel
- US1: alle Tests T036–T043 parallel; danach T049, T050, T051 parallel
- US2: T056–T059 parallel nach T054/T055
- Nach US1 können US2, US4, US3, US5, US7, US8, US6 von verschiedenen Personen parallel bearbeitet werden (Konflikte nur in `src/views/rom-info/` und `src/app/layout/SlotHeader.tsx` – dort nacheinander mergen)

## Parallel Example: User Story 1

```text
Task: "Write tests/emulator/sameboy-adapter.test.ts"
Task: "Write tests/emulator/determinism.test.ts"
Task: "Write tests/emulator/mbc.test.ts"
Task: "Write tests/emulator/input.test.ts"
Task: "Write tests/emulator/battery.test.ts"
Task: "Write tests/unit/indexeddb-rom-store.test.ts"
Task: "Write tests/unit/emulator-session.test.ts"
Task: "Write tests/unit/frame-clock.test.ts"
```

## Implementation Strategy

### MVP First (US1)

1. Phase 1 + 2 (inkl. Herkunftsnachweis in `third_party/`, ADR-0006, arc42 Kap. 7/8)
2. US1 → ROM laden und spielen (Direktstart, ohne Ton)
3. **Stop und prüfen**: `npm run check`, `npm run test:e2e -- m1-load-play`, manuell am Handy

### Incremental Delivery

1. US2 → eigene Boot-ROM, SC-001/SC-002 grün
2. US4 → Ton (alle P1-Stories fertig)
3. US3 → Service-Verträge im Echtbetrieb
4. US5 + US7 → E-Ink-Modus und Zoom
5. US8 → ROM Info und Memory Map vollständig
6. US6 → View-Wechsel per Kopfleiste
7. Polish → arc42, Gerätetests, Abnahme, Version `0.3.0`
