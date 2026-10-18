---

description: "Task list for M0 – Gerüst"
---

# Tasks: M0 – Gerüst

**Input**: Design documents from `specs/000-m0-scaffold/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Pflicht laut Constitution VIII ("Tests pro Baustein"). Testaufgaben stehen vor der
jeweiligen Umsetzung und müssen zuerst fehlschlagen.

**Organization**: Nach User Stories gruppiert. Alle Pfade relativ zum Repo-Root.

**Allgemeine Regeln für jede Aufgabe**: Code, Bezeichner, Kommentare, Commits auf Englisch; Doku auf
Deutsch. UI-Texte Englisch direkt im Code. Keine Literalwerte für Farben/Abstände/Zeiten außerhalb von
`src/app/theme/tokens.css`. Keine `transition`/`animation`/`:hover`. Versionen exakt wie in
research.md R1. Kleine Commits je Aufgabe oder Aufgabengruppe.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelisierbar (andere Dateien, keine offenen Abhängigkeiten)
- **[Story]**: zugehörige User Story (US1–US5 aus spec.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Projekt initialisieren

- [X] T001 Create `package.json` (name `dotmerlingame`, `private: true`, `type: module`, `engines.node: ">=24"`) with exact dependency versions from research.md R1: dependencies `react@19.3.1`, `react-dom@19.3.1`; devDependencies `typescript@6.0.3`, `vite@8.3.4`, `@vitejs/plugin-react@6.1.2`, `vitest@5.0.5`, `jsdom@30.1.3`, `@testing-library/react@16.3.3`, `@playwright/test@1.64.1`, `eslint@10.13.0`, `typescript-eslint@8.71.2`, `eslint-plugin-import-x@4.17.1`, `stylelint@17.16.0`, `stylelint-config-standard@40.0.0`, `secretlint@13.0.7`, `@secretlint/secretlint-rule-preset-recommend@13.0.7`, `license-checker-rseidelsohn@5.0.1`, matching `@types/react`/`@types/react-dom`/`@types/node`; run `npm install` and commit `package-lock.json`
- [X] T002 [P] Create `.nvmrc` with `24`
- [X] T003 [P] Create `.gitignore` per research.md R13 and R5: `node_modules/`, `dist/`, `coverage/`, `test-results/`, `playwright-report/`, `*.gb`, `*.gbc`, `*.sgb`, `roms/`, `dmg_boot.bin`, `dmg0_boot.bin`, `.env*`; do NOT ignore `*.bin` globally
- [X] T004 [P] Create `LICENSE` with the standard MIT license text, copyright line `Copyright (c) 2026 Merlin Becker`
- [X] T005 [P] Create `tsconfig.json` (strict, `noUncheckedIndexedAccess`, `jsx: react-jsx`, `moduleResolution: bundler`, `noEmit`, `erasableSyntaxOnly`, `allowImportingTsExtensions`, `types: ["node"]` for `build`/`scripts`; research.md R15) covering `src`, `tests`, `build`, `scripts`, `vite.config.ts`, `playwright.config.ts`
- [X] T006 [P] Create `src/config/project.ts` exporting `PROJECT_NAME = 'DotMerlinGame'` and `PROJECT_SHORT_NAME`; this is the only place the name appears in code (FR-009)
- [X] T007 [P] Create placeholder READMEs (German, one paragraph each, purpose + milestone) in `src/views/README.md`, `src/adapters/README.md`, `examples/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Werkzeuge und Basis, die alle Stories brauchen

**⚠️ CRITICAL**: Keine Story-Arbeit vor Abschluss dieser Phase

- [X] T008 Write unit tests in `tests/unit/build-version.test.ts` for `resolveBuildVersion(run)` where `run` is an injected command runner: clean repo → short hash; dirty working tree → `<hash>-dirty`; runner throws (no git) → `unknown`; empty output → `unknown`
- [X] T009 Implement `build/build-version.ts` exporting `resolveBuildVersion(run = execSync-based runner)` (research.md R5) and create `vite.config.ts`: React plugin; `define.__BUILD_VERSION__ = JSON.stringify(resolveBuildVersion())`; dev server `host: true`; register the manifest plugin from T025 once it exists
- [X] T010 Create `src/vite-env.d.ts` declaring `const __BUILD_VERSION__: string`
- [X] T011 [P] Create `vitest.config.ts` (environment `jsdom`, include `tests/{unit,contract,roundtrip,boot-state,tooling}/**/*.test.ts?(x)`, `typecheck.enabled: true` with include `tests/contract/**/*.test-d.ts`)
- [X] T012 [P] Create `playwright.config.ts`: only project `chromium`, `testDir: tests/e2e`, `webServer` runs `npm run preview -- --port 4173 --strictPort`, `baseURL: http://localhost:4173`
- [X] T013 [P] Create `eslint.config.js` (flat config): typescript-eslint recommended + strict type-checked for `src`, `tests`, `build`, `scripts`; architecture rules from research.md R11 via `no-restricted-imports`: `src/core/**` may not import `react`, `react-dom`, `**/adapters/**`, `**/views/**`, `**/app/**`; `src/views/**` may not import `**/adapters/**`; `import-x/no-extraneous-dependencies` with `devDependencies: false` for `src/**` and `true` for `tests/**`, `build/**`, `scripts/**`, config files
- [X] T014 [P] Create `.stylelintrc.json` extending `stylelint-config-standard`; for all CSS except `src/app/theme/tokens.css`: `color-no-hex: true`, `function-disallowed-list: [rgb, rgba, hsl, hsla, hwb, lab, lch, oklab, oklch, color]`, `color-named: never`, `unit-disallowed-list: [px, ms, s]`, `property-disallowed-list: [/^transition/, /^animation/]`, `selector-pseudo-class-disallowed-list: [hover]`; override for `src/app/theme/base.css` allowing only the motion kill rule properties
- [X] T015 Create `src/app/theme/tokens.css` with CSS custom properties, grayscale only: `--color-fg` (black), `--color-bg` (white), `--color-muted`, `--color-border`, `--color-inverse-fg/bg`; spacing scale `--space-1..6`; `--border-width-frame` (thick), `--border-width-header`; `--focus-outline-width`, `--focus-outline-offset`, `--focus-outline-color` (black); `--touch-target-min` (≥ 48px); `--slot-min-size` (320px); `--font-family-ui`, `--font-size-*`; time tokens `--duration-short`, `--duration-medium` all `0ms`
- [X] T016 Create `src/app/theme/base.css`: import tokens; `html[data-motion="off"] *, html[data-motion="off"] *::before, html[data-motion="off"] *::after { transition: none !important; animation: none !important; }`; `@media (prefers-reduced-motion: reduce)` same rule for all; `caret-color` and `:focus-visible` outline from tokens; body uses `--color-fg`/`--color-bg`; no horizontal overflow
- [X] T017 Add npm scripts to `package.json` exactly as in [contracts/npm-scripts.md](contracts/npm-scripts.md): `dev`, `build` (`tsc --noEmit && vite build`), `preview`, `test` (`vitest run`), `test:e2e` (`playwright test`), `lint` (`eslint . && stylelint "src/**/*.css"`), `typecheck`, `licenses`, `licenses:generate`, `secrets`, `check` (sequential, stop on first failure: lint → typecheck → test → build → test:e2e → licenses → secrets)

**Checkpoint**: `npm run lint`, `npm run typecheck`, `npm test` laufen (noch ohne Tests)

---

## Phase 3: User Story 1 – Lauffähige App-Shell auf dem Gerät (Priority: P1) 🎯 MVP

**Goal**: Shell startet in Chrome, zeigt Raster aus leeren quadratischen Slots mit Kopfleisten,
Build-Version in der Fußzeile, Manifest mit Icons, kein Service Worker.

**Independent Test**: `npm run build && npm run test:e2e -- shell` grün; App im Browser öffnen,
Fußzeile mit `dist/build-info.json` vergleichen, Gerät drehen.

### Tests for User Story 1 ⚠️

- [X] T018 [P] [US1] Unit tests for `computeGrid` in `tests/unit/grid.test.ts` (data-model.md GridSpec: "`columns` und `rows` je 1–4, `columns × rows ≥ 2`"): portrait phone → 1×2; landscape phone → 2×1; tablet/desktop → more slots up to 4×4; width < 320px → still ≥ 2 slots with `slotSize` below the minimum, never wider than viewport; zero/negative sizes handled
- [X] T019 [P] [US1] E2E test in `tests/e2e/shell.spec.ts`: page loads, ≥ 2 elements with `data-testid="slot"` each having a header (`data-testid="slot-header"`); slots are square (width = height ±1px); portrait viewport 390×844 → slots stacked vertically, landscape 844×390 → side by side; footer text equals `version` from `dist/build-info.json`; `navigator.serviceWorker.getRegistrations()` returns `[]` after load + 2 s; `link[rel=manifest]` exists and fetched manifest has `name === PROJECT_NAME`, icons 192 and 512, `display: "standalone"`, `start_url`; `document.title` contains `PROJECT_NAME`

### Implementation for User Story 1

- [X] T020 [P] [US1] Implement pure `computeGrid(viewport: {width, height}, minSlotSize: number): GridSpec` in `src/app/layout/grid.ts` per research.md R9
- [X] T021 [P] [US1] Implement `SlotHeader` component in `src/app/layout/SlotHeader.tsx` (+ `SlotHeader.module.css`): shows title (empty slot: "Empty"), previous/next buttons with large touch targets (`--touch-target-min`), buttons disabled in M0; header is the only place for future content switching (FR-002)
- [X] T022 [P] [US1] Implement `Slot` component in `src/app/layout/Slot.tsx` (+ `Slot.module.css`): square (`aspect-ratio: 1`), thick frame border from tokens, `SlotHeader` + empty content area; `data-testid="slot"`
- [X] T023 [US1] Implement `Grid` component in `src/app/layout/Grid.tsx` (+ `Grid.module.css`): reads viewport size (resize/orientation listener, no animation), uses `computeGrid` and `--slot-min-size`, renders empty slots from an in-memory `LayoutState` (all `null`); no horizontal scroll
- [X] T024 [P] [US1] Implement `Footer` in `src/app/shell/Footer.tsx` showing `Build ${__BUILD_VERSION__}` and `AppShell` in `src/app/shell/AppShell.tsx` (Grid + Footer); mount in `src/app/main.tsx` with `index.html` (`<html lang="en" data-motion="off">`, root div, no inline styles)
- [X] T025 [US1] Implement Vite plugin `build/manifest-plugin.ts`: emits `manifest.webmanifest` from `PROJECT_NAME`/`PROJECT_SHORT_NAME` (`start_url: "/"`, `display: "standalone"`, icons 192/512 PNG + SVG; `background_color`/`theme_color` parsed from `--color-bg`/`--color-fg` in `src/app/theme/tokens.css`, build fails if missing, research.md R16), injects `<link rel="manifest">` and `<title>` via `transformIndexHtml`, writes `dist/build-info.json` (`{ "version": <__BUILD_VERSION__> }`); register in `vite.config.ts`; no service worker code anywhere
- [X] T026 [P] [US1] Create own monochrome logo `public/icons/logo.svg` (simple geometric "dot" mark, black on white, no Nintendo/Game Boy elements) and script `scripts/render-icons.ts` that renders it with Playwright Chromium to `public/icons/icon-192.png` and `public/icons/icon-512.png`; run it once and commit the PNGs

**Checkpoint**: US1 vollständig und unabhängig prüfbar

---

## Phase 4: User Story 2 – E-Ink-taugliche Oberfläche (Priority: P1)

**Goal**: Shell nur in Graustufen, ohne Bewegung, Tokens als einzige Literalquelle, klarer Fokus.

**Independent Test**: `npm run lint` (Stylelint-Regeln) und `npm run test:e2e -- eink` grün;
Graustufen-Screenshot manuell bewerten.

**Depends on**: US1 (prüft die Shell)

### Tests for User Story 2 ⚠️

- [X] T027 [P] [US2] E2E test in `tests/e2e/eink.spec.ts`: `document.getAnimations()` is empty; for every element computed `transition-duration` is `0s` and `animation-name` is `none`; for every element `color`, `background-color`, `border-{top,right,bottom,left}-color`, `outline-color`, `caret-color` and SVG `fill`/`stroke` parse to R = G = B (ignore fully transparent); press Tab through all focusable elements and repeat the color check plus assert a visible outline (`outline-width` ≥ 2px) on the focused element; emulate `prefers-reduced-motion: reduce` and repeat the motion checks; assert every focusable element's bounding box is at least the computed value of `--touch-target-min` in width and height (FR-008); save a grayscale full-page screenshot to `test-results/m0-grayscale.png` for manual review (SC-005)
- [X] T028 [P] [US2] Stylelint fixture test in `tests/tooling/stylelint-rules.test.ts`: run stylelint API on inline CSS samples and assert errors for a hex color, a `px` value, a `transition`, an `animation` and a `:hover` selector in a non-token file, and no errors for the same values in `tokens.css`

### Implementation for User Story 2

- [X] T029 [US2] Audit all CSS modules from US1 against tokens: replace any literal with tokens, ensure focus styles use `--focus-outline-*`, disabled state distinguishable without color (e.g. dashed border or reduced weight plus `aria-disabled`); fix until T027/T028 pass
- [X] T030 [US2] Document in `src/app/theme/README.md` (German): token categories, rule "no literals outside tokens.css", motion switch via `data-motion` and `prefers-reduced-motion`, how to add a token

**Checkpoint**: US1 + US2 erfüllen alle UI-Abnahmekriterien von M0

---

## Phase 5: User Story 3 – Verlässliches Arbeitsfundament (Priority: P2)

**Goal**: Ein Befehl prüft alles wie die CI; CI prüft Build, Lint, Typen, Tests, Secrets, Lizenzen.

**Independent Test**: frischer Klon → `npm ci && npm run check` grün; Push → CI grün;
Negativproben aus [quickstart.md](quickstart.md) Abschnitt 3.

### Tests for User Story 3 ⚠️

- [ ] T031 [P] [US3] Unit tests in `tests/unit/license-policy.test.ts` for `evaluateLicenses()` (research.md R2): runtime `MIT` → ok; runtime `MPL-2.0` → blocked; runtime `(MIT OR GPL-3.0)` → ok; runtime `(MIT AND CC-BY-3.0)` → blocked; dev `BlueOak-1.0.0` → listed; dev `GPL-3.0-or-later`, `LGPL-2.1-only`, `AGPL-3.0`, `SSPL-1.0` → blocked; dev `UNKNOWN`/`UNLICENSED`/missing → blocked; exception entry with ADR reference → ok; exception without ADR reference → rejected
- [ ] T032 [P] [US3] Test in `tests/tooling/secret-scan.test.ts`: create a temp dir, write a file containing a generated fake credential that the recommended preset detects (build the string at runtime, never commit it), run secretlint via its Node API on that file and assert at least one finding; run on a clean file and assert none
- [ ] T033 [P] [US3] Test in `tests/tooling/gitignore.test.ts`: `git check-ignore` reports `roms/x.gb`, `game.gb`, `game.gbc`, `dmg_boot.bin` as ignored and `examples/demo/data.bin` as NOT ignored

### Implementation for User Story 3

- [ ] T034 [US3] Implement `scripts/license-policy.ts` exporting `evaluateLicenses(packages, exceptions)` (pure, SPDX `OR`/`AND` handling, allowlist and copyleft regex `/\b(A|L)?GPL\b|SSPL/i`) and `scripts/check-licenses.ts` that runs license-checker-rseidelsohn twice (`--production` and `--development`, `--json --excludePrivatePackages`), loads `third_party/license-exceptions.json`, prints a table of `listed` dev packages, exits 1 on any `blocked`, and verifies `THIRD_PARTY_LICENSES` equals the output of the generator (T052)
- [ ] T035 [P] [US3] Create `.secretlintrc.json` with `@secretlint/secretlint-rule-preset-recommend` and `scripts/check-secrets.ts` running secretlint on `git ls-files` output (excluding `package-lock.json` only if needed and documented)
- [ ] T036 [US3] Resolve exact commit SHAs again with `git ls-remote` and create `.github/workflows/ci.yml`: on `push` and `pull_request`; `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`, `actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0` with `node-version-file: .nvmrc` and npm cache; `npm ci`; `npx playwright install --with-deps chromium`; `npm run check`; `permissions: contents: read`
- [ ] T037 [US3] Verify locally (no file change, result goes into `docs/abnahme/m0.md`): fresh `rm -rf node_modules dist && npm ci && npm run check` passes; record result in the PR description

- [ ] T038 [US3] Ask the project owner for approval, then push `feature/firstSteps` to GitHub and confirm the CI run for `.github/workflows/ci.yml` is green (SC-001); record run URL in `docs/abnahme/m0.md`

**Checkpoint**: Gesamtprüfung lokal = CI, Negativproben schlagen an, CI auf GitHub grün

---

## Phase 6: User Story 4 – Verbindliche Schnittstellen (Priority: P2)

**Goal**: View-Vertrag, Eventkanäle, Ports und Layout-Typen in `src/core/`, durch Typ- und
Vertragstests abgesichert; Test-Rahmen für Roundtrip und Boot-Zustand.

**Independent Test**: `npm test` grün inklusive Typ-Tests; `it.todo` sichtbar im Bericht.

### Tests for User Story 4 ⚠️

- [ ] T039 [P] [US4] Type tests in `tests/contract/events.test-d.ts` per [contracts/events.md](contracts/events.md) "Zusicherungen" 1–4: `// @ts-expect-error` on `bus.publish({ type: 'Unknown' })`; handler for `'BreakpointHit'` receives exactly `EventOf<'BreakpointHit'>`; `PublishRate` accepts only `full`, `reduced` (with `everyNthFrame`), `on-demand`; `FrameStateSource` assignable to the parameters of React `useSyncExternalStore`
- [ ] T040 [P] [US4] Type tests in `tests/contract/view-contract.test-d.ts` per [contracts/view-contract.md](contracts/view-contract.md) "Zusicherungen" 3–4: `ViewContext` exposes no emulator mutation besides `dispatch`; `ViewContext.events` has no `publish` (`@ts-expect-error`)
- [ ] T041 [P] [US4] Contract test in `tests/contract/view-contract.test.ts`: dummy view implementing `ViewDefinition<{ counter: number }>` with `serialize`/`deserialize`; assert `deserialize(serialize(s))` deep-equals `s`; dummy `ViewContext` built from in-test fakes compiles and `dispatch({ type: 'Pause' })` is recorded
- [ ] T042 [P] [US4] Pending frameworks: `tests/roundtrip/roundtrip.test.ts` with `it.todo('ROM → source → build is byte-identical (M3)')` and `tests/boot-state/boot-state.test.ts` with `it.todo('registers after own boot ROM match Pan Docs Power Up Sequence for DMG (M1)')` and `it.todo('test ROM runs identically with own boot ROM and direct start (M1)')`

### Implementation for User Story 4

- [ ] T043 [P] [US4] Create shared types in `src/core/types.ts`: `Unsubscribe = () => void`, `JsonValue` (recursive JSON type), `Button = 'Up' | 'Down' | 'Left' | 'Right' | 'A' | 'B' | 'Start' | 'Select'`
- [ ] T044 [P] [US4] Create `src/core/events/frame-state.ts` per [contracts/events.md](contracts/events.md) and data-model.md FrameSnapshot: readonly `frame` (integer ≥ 0), `cycles`, `registers` (`a, f, b, c, d, e, h, l` 8-bit; `sp, pc` 16-bit), `flags` (`z, n, h, c` boolean), `changedMemory: readonly { start: number; bytes: Uint8Array }[]`; `PublishRate` ("`reduced` (mit `everyNthFrame ≥ 2`)"), `FrameStateSource`, `FrameStatePublisher`; TSDoc states value ranges
- [ ] T045 [P] [US4] Create `src/core/events/domain-events.ts` per [contracts/events.md](contracts/events.md): union `DomainEvent` with exactly `RomLoaded`, `BuildFinished`, `BreakpointHit`, `ProjectChanged`; `DomainEventType`, `EventOf`, `DomainEventSubscriber`, `DomainEventBus`
- [ ] T046 [P] [US4] Create `src/core/view/view-actions.ts` (`ViewAction` union: `Pause`, `Resume`, `Reset`, `SetBreakpoint {address, bank?}`, `ClearBreakpoint {address, bank?}`, `ButtonDown {button}`, `ButtonUp {button}`) and `src/core/view/view-contract.ts` (`ViewSize`, `ViewContext` incl. `visible`, `ViewDefinition<S>`, `ViewTypeId`, `IconId`, `ProjectStateSource` as minimal read-only subscribe/getSnapshot of the current project id/name)
- [ ] T047 [P] [US4] Create ports in `src/core/ports/emulator.ts`, `assembler.ts`, `project-store.ts`, `archive.ts` exactly per [contracts/ports.md](contracts/ports.md); TSDoc notes that ROMs only appear in `BuildResult` (Constitution I) and that debug access scope is an open point
- [ ] T048 [P] [US4] Create `src/core/layout/layout-state.ts`: `LayoutState { version: 1; slots: readonly (SlotContent | null)[] }`, `SlotContent { viewTypeId; viewState: JsonValue }`, TSDoc "Länge 2–16, enthält keine Projekt-, ROM- oder Emulatordaten"; refactor `src/app/layout/Grid.tsx` to use this type
- [ ] T049 [US4] Create `src/core/index.ts` re-exporting the public contracts; run `npm run lint` to confirm architecture import rules pass

**Checkpoint**: Verträge stehen, Typ-Tests grün

---

## Phase 7: User Story 5 – Dokumentations- und Lizenzgerüst (Priority: P3)

**Goal**: ADRs, `third_party/`, `THIRD_PARTY_LICENSES`, arc42 ergänzt.

**Independent Test**: Dateien vorhanden; `npm run licenses` grün; Inhalte entsprechen Briefing und research.md.

- [ ] T050 [P] [US5] Create `docs/adr/0000-template.md` (German): Titel, Status (vorgeschlagen/akzeptiert/ersetzt), Datum, Kontext, Entscheidung, Konsequenzen, Alternativen, Bezüge
- [ ] T051 [P] [US5] Write ADRs in German, status "akzeptiert", date 2026-10-18, content from briefing/constitution/research: `docs/adr/0001-web-stack.md` (incl. TS 6 pin, research R1), `0002-persistenz-indexeddb-zip.md`, `0003-fremdkomponenten-strategie.md` (Ports/Adapter, Vorlage statt Fundament, two-tier license check, scope of `third_party/` = shipped code, exceptions file), `0005-quelltext-einzige-wahrheit.md` (incl. M1 transitional direct ROM run), `0007-lizenz-und-marke.md`, `0008-eventmodell-und-offline.md` (two channels, publish rates, no service worker until M7), `0009-ui-prinzipien-eink.md` (tokens, no motion, grayscale, paging, focus), `0010-kein-backend-statisches-hosting.md` (static files only, Replit for now, hoster-agnostic, Chrome installability source)
- [ ] T052 [US5] Implement `scripts/generate-third-party.ts`: reads production dependencies via license-checker-rseidelsohn, writes `THIRD_PARTY_LICENSES` (per package: name, version, license, repository, full LICENSE file text) and `third_party/npm.md` (table: package, version, license, source); run it and commit both outputs
- [ ] T053 [P] [US5] Create `third_party/README.md` (German): format per component (Quelle, Version, Lizenz, Commit-Hash bzw. Paketversion), scope = shipped code only, link to ADR-0003; create `third_party/license-exceptions.json` as `[]`
- [ ] T054 [P] [US5] Update arc42: `docs/arc42/05-bausteinsicht.md` (actual `src/` structure, contracts as built), `docs/arc42/09-architekturentscheidungen.md` (ADR status → akzeptiert with links), add `docs/arc42/08-querschnittliche-konzepte.md` (design tokens, motion, focus, license check, build version) and update `docs/arc42/README.md` table

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T055 Update `CLAUDE.md` section "Befehle" with the final scripts from [contracts/npm-scripts.md](contracts/npm-scripts.md) (remove "werden in M0 angelegt")
- [ ] T056 Update root `README.md` (English, short): what the project is, "no backend, static site", `npm ci`, `npm run dev`, `npm run check`, link to `docs/`
- [ ] T057 Run full acceptance from [quickstart.md](quickstart.md) sections 1–5 incl. manual device check in Chrome on Android/E-Ink; store grayscale screenshot under `docs/abnahme/m0-grayscale.png` and note results in `docs/abnahme/m0.md` (German)
- [ ] T058 Re-check Constitution gates in [plan.md](plan.md) against the built result; mark spec acceptance criteria as verified

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → User Stories → **Polish (Phase 8)**
- **US1** (Phase 3): nach Phase 2
- **US2** (Phase 4): nach US1 (prüft die Shell)
- **US3** (Phase 5): nach Phase 2; T034 braucht T052 für die Aktualitätsprüfung von `THIRD_PARTY_LICENSES`, T037 braucht alle anderen Phasen
- **US4** (Phase 6): nach Phase 2, unabhängig von US1–US3 (nur T048 refaktoriert `Grid.tsx` aus US1)
- **US5** (Phase 7): nach Phase 2; T052 vor T034-Abschluss

### Within Each User Story

- Tests zuerst schreiben und fehlschlagen lassen, dann umsetzen
- Typen vor Komponenten, Komponenten vor Integration

### Parallel Opportunities

- Phase 1: T002–T007 parallel
- Phase 2: T011–T014 parallel nach T009/T010
- US1: T018, T019 parallel; danach T020, T021, T022, T024, T026 parallel
- US4: alle Tests (T039–T042) parallel, alle Typdateien (T043–T048) parallel
- US4 und US5 können parallel zu US1/US2 laufen

## Parallel Example: User Story 4

```text
Task: "Type tests in tests/contract/events.test-d.ts"
Task: "Type tests in tests/contract/view-contract.test-d.ts"
Task: "Contract test in tests/contract/view-contract.test.ts"
Task: "Create src/core/events/frame-state.ts"
Task: "Create src/core/events/domain-events.ts"
Task: "Create ports in src/core/ports/"
```

## Implementation Strategy

### MVP First (US1)

1. Phase 1 + 2
2. US1 → Shell läuft im Browser mit Build-Version, ohne Service Worker
3. **Stop und prüfen**: `npm run test:e2e -- shell`, manuell am Gerät

### Incremental Delivery

1. US1 → US2: Shell erfüllt E-Ink-Abnahme
2. US4: Verträge für M1
3. US5 + US3: Doku, Lizenzen, CI → `npm run check` = CI grün
4. Polish: Abnahme dokumentieren, M0 abgeschlossen
