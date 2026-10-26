---

description: "Task list for M1b – Speicher-Ansichten (nur lesen)"
---

# Tasks: M1b – Speicher-Ansichten (nur lesen)

**Input**: Design documents from `specs/004-m1b-memory-views/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Pflicht laut Constitution VIII. Testaufgaben stehen vor der jeweiligen Umsetzung und müssen
zuerst fehlschlagen. Tests nie abschwächen oder auskommentieren. Einzige Ausnahme ist T001: Er läuft
absichtlich gegen den unveränderten M1-Code und hält das Ergebnis fest.

**Organization**: Nach User Stories gruppiert (US1–US6 aus spec.md, nach Priorität sortiert). Alle Pfade
relativ zum Repo-Root.

**Allgemeine Regeln für jede Aufgabe**:
- Code, Bezeichner, Kommentare und Commits auf Englisch, Doku auf Deutsch, UI-Texte Englisch im Code.
- **Tokens**: Keine Literalwerte für Farben, Abstände, Schriftgrößen und Zeiten außerhalb von
  `src/app/theme/tokens.css`. Kein `transition`, `animation` oder `:hover`. Markierungen nur durch
  Invertieren oder Rahmen, nie nur durch Farbe.
- **Keine Hardware-Werte aus dem Gedächtnis**: Sie stammen aus Pan Docs (`gbdev/pandocs`, Commit
  `8dc19b1`, siehe [research.md](research.md) R9). Jede Konstante bekommt einen Quellkommentar mit
  Seitenname.
- **Core-Verhalten**: nur mit Fundstelle im SameBoy-Quelltext (`.build/sameboy/`, Commit `26a56bd`).
- **Zugriffsgrenze**: Views lesen nur `context.frameState`, `context.session` und `context.events`. Sie
  dispatchen nur `SetFrameRate` und `RequestSnapshot` (FR-002, FR-003).
- **Versionsnummer**: Jeder Commit mit Codeänderung erhöht die Patch-Stelle in `package.json` um eins
  (Stand `0.3.0`). Reine Doku-Commits ändern sie nicht. Die Abnahme von M1b setzt die Version auf `0.4.0`.
- **Generierte Dateien**: `generated/` nie von Hand bearbeiten. Jede Änderung an `wrapper.c` erfordert
  `npm run core:build` und das Artefakt im selben Commit.
- **View-Tests**: React-Rendering-Tests liegen als `tests/unit/view-*.test.tsx` (vorhandenes
  Vitest-Muster). Emulator-Tests laufen mit `// @vitest-environment node`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelisierbar (andere Dateien, keine offenen Abhängigkeiten)
- **[Story]**: zugehörige User Story

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Befund aus M1 festhalten, Tokens, Registrierung

- [X] T001 Write `tests/emulator/inspection-identity.test.ts` (node environment). Drive the adapter from
  `tests/support/emulator.ts` with `advance(1)` for 300 frames per test ROM in `tests/roms/build/`
  (all entries of `tests/roms/src/roms.json` that are not rejected at load), in three runs:
  - (a) no frame-state subscriber
  - (b) one subscriber with publish rate `full`, so a snapshot is built every frame
  - (c) the same as (b) plus `setInspectionDemand(true)`. Add (c) as `it.todo` until T018.

  Compare the screen bytes after frame 300 and the concatenation of all audio samples pushed to a
  recording `AudioSink`; they must be identical across runs.

  Run it against the unchanged M1 code. Record the result for (a) vs (b) in
  `specs/004-m1b-memory-views/research.md` under R2:
  - If it differs, the result is "difference reproduced". Mark (b) `it.fails` with a comment pointing
    to T018.
  - If it is identical, the result is "no observable difference, fix still applied for principle".
- [X] T002 [P] Add tokens to `src/app/theme/tokens.css`:
  - `--font-family-mono` (system monospace stack)
  - `--font-size-mono-min` (minimum readable size for hex rows, start value 14px, noted as checked on
    the device in T074)
  - `--mark-border-width`, `--mark-inverse-fg`, `--mark-inverse-bg` (grayscale values)
  - `--tile-pixel-min` (minimum CSS pixels per tile pixel)

  Extend the stylelint token test if one lists allowed tokens.
- [X] T003 [P] Create `src/app/views/m1b-views.ts` exporting `M1B_VIEWS: readonly RegisteredView[] = []`
  and register it next to `M1_VIEWS` where `registerViews` is called (`src/app/main.tsx` or
  `src/app/services.ts`). Extend `DEFAULT_VIEW_ORDER` in `src/app/layout/layout-store.ts` to `['screen',
  'controller', 'rom-info', 'memory-map', 'hex', 'registers', 'tiles', 'tilemaps', 'sprites']` and make
  `cycleView` skip ids that are not registered yet. Update `tests/unit/view-cycle.test.ts` and
  `tests/unit/layout-store.test.ts`; the default slot layout stays unchanged.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Lesepfad ohne Nebenwirkung, Inspektionsdaten im Frame-Zustand, Snapshot-Anforderung pro Slot,
Test-ROMs, gemeinsame View-Bausteine. **Keine Story-Arbeit vor Abschluss dieser Phase.**

### 2a – Wrapper und WASM (contracts/wasm-abi.md)

- [X] T004 Add the six functions from `specs/004-m1b-memory-views/contracts/wasm-abi.md` to
  `src/adapters/emulator/sameboy/wrapper.c`:
  - `dmg_area(int area, size_t *size)` returns the pointer and size for area 0 ROM, 1 VRAM, 2 WRAM,
    3 OAM, 4 HRAM, 5 cartridge RAM via `GB_get_direct_access`. Unknown area → `NULL`, size 0.
  - `dmg_io(uint8_t out[128])` copies `io_registers` and sets `out[0x04] = div_counter >> 8`
    (`/* GB_INTERNAL: … */` comment citing `Core/memory.c:674`).
  - `dmg_ie(void)`.
  - `dmg_banks(uint16_t out[3])` writes the ROM bank, ROM0 bank and cartridge RAM bank from the `bank`
    out-parameter of `GB_get_direct_access`.
  - `dmg_cart_ram_enabled(void)` returns 1, 0, or −1 for `GB_NO_MBC`, from `mbc_ram_enable` and
    `cartridge_type->mbc_type` with `GB_INTERNAL` comments.
  - `dmg_cpu_flags(void)` returns bit 0 `ime`, bit 1 `halted` with `GB_INTERNAL` comments.

  None of them may call `GB_read_memory`, `GB_safe_read_memory`, `GB_display_sync` or `GB_apu_run`.
- [X] T005 Add the six exports to `EXPORTS` in `scripts/build-core.sh`, declare them in
  `src/adapters/emulator/sameboy/sameboy-module.d.ts`, run `npm run core:build` (Docker), and commit the
  regenerated `generated/sameboy.mjs`, `generated/sameboy.wasm` and `generated/BUILD-INFO.json` together
  with T004. Run `npm run core:verify` and make sure `tests/unit/build-info.test.ts` stays green.
- [X] T006 Update `third_party/sameboy.md` in the same commit as T005 (wrapper functions added in M1b, list of all
  `GB_INTERNAL` fields used: `boot_rom_finished`, `div_counter`, `mbc_ram_enable`, `cartridge_type`,
  `ime`, `halted`; core unchanged) and the M1 ABI table in
  `specs/001-m1-emulator-bootrom/contracts/wasm-abi.md` with a pointer to the M1b addendum

### 2b – Frame-Zustand und Hub (contracts/frame-state.md)

- [ ] T007 Write tests in `tests/unit/frame-state-hub.test.ts` (extend):
  - `inspection` builds only while `setInspectionDemand(true)`, and the build callback receives the
    flag.
  - `prime(build)` followed by `requestSnapshot()` delivers before any `offer`.
  - Five `requestSnapshot()` calls in the same task lead to exactly one build, delivered in a
    microtask.
  - An `offer` before the microtask satisfies pending requests without an extra build.
  - Inside the subscriber callback `getDeliveryKind()` returns `'request'` for request deliveries and
    `'frame'` for `offer` deliveries.
- [ ] T008 Extend `src/core/events/frame-state.ts` with `InspectionSnapshot`, `CartRamSnapshot`,
  `FrameSnapshot.inspection: InspectionSnapshot | null` and
  `FrameStatePublisher.setInspectionDemand(active: boolean)` and `getDeliveryKind(): 'frame' | 'request'`, exactly as in
  `specs/004-m1b-memory-views/contracts/frame-state.md`, and export them from `src/core/index.ts`. Fix
  every existing `FrameSnapshot` literal in tests (`inspection: null`).
- [ ] T009 Implement demand, `prime`, request coalescing (`queueMicrotask`) and `getDeliveryKind()` in
  `src/core/events/frame-state-hub.ts`. Change the `offer` build signature to
  `build(withInspection: boolean)`. T007 must be green.
- [ ] T010 [P] Extend `tests/contract/events.test-d.ts`: `inspection` fields are `readonly`, and
  `FrameSnapshot` without `inspection` does not compile.

### 2c – Test-ROMs (data-model.md, Neue Test-ROMs)

- [ ] T011 [P] Check that `scripts/build-test-roms.ts` supports `ramSize` and `defines` for all new entries.
  Extend it only if needed, with `tests/tooling/` coverage.
- [ ] T012 [P] Add the entries `inspect-mem`, `inspect-regs`, `inspect-regs-halted`, `inspect-gfx` and
  `inspect-gfx-tall` to `tests/roms/src/roms.json`:
  - `inspect-mem`: MBC5 `"mbc": "0x1B"`, `"ramSize": "0x03"`, at least 8 ROM banks.
  - `inspect-regs-halted`: `"defines": { "HALTED": 1 }`.
  - `inspect-gfx-tall`: `"defines": { "TALL": 1 }`.
- [ ] T013 [P] Write `tests/roms/src/inspect-mem.asm` (`hardware.inc` constants only):
  - Write a distinct byte pattern into each of the 4 cartridge RAM banks (bank number in the first
    byte).
  - Patterns in WRAM `$C000–$C0FF` and HRAM `$FF80–$FF8F`, `IE = $05`.
  - Leave ROM bank 3 mapped and disable cartridge RAM.
  - Mark every ROM bank with its number at offset `$4000`.
  - Loop forever.
  - Expected values are in a comment table at the top of the file.
- [ ] T014 [P] Write `tests/roms/src/inspect-regs.asm`:
  - Set A, B, C, D, E, H, L, SP to fixed documented values.
  - Set F through `pop af` from a known word (Z and C set, N and H clear; lower nibble zero per Pan Docs
    "CPU Registers and Flags").
  - `di`, then `jr @` at a fixed label.
  - With `HALTED`: `ei`, `IE = 0`, `halt`.
- [ ] T015 [P] Write `tests/roms/src/inspect-gfx.asm`. With the LCD off, write known tile patterns into
  all three blocks (`$8000`, `$8800`, `$9000`), each tile encoding its own index. Then:
  - Fill the BG map `$9800` and the window map `$9C00` with known indices.
  - `SCX = 100`, `SCY = 200` (wrap case).
  - `WX = 87`, `WY = 40`, window on (`LCDC.5`, `LCDC.6 = 1`).
  - `BGP = $E4`, `OBP0 = $1B`, `OBP1 = $E4`.
  - 40 OAM entries written directly while the LCD is off: at least 3 visible, 3 hidden by Y, 2 hidden
    by X, one each with X flip, Y flip, priority and OBP1.

  Without `TALL`: `LCDC.4 = 1`, `LCDC.2 = 0`. With `TALL`: `LCDC.4 = 0` (`$8800` method),
  `LCDC.2 = 1`.

  Then turn the LCD on and loop. Document the expected values in a comment table.
- [ ] T016 Extend `tests/emulator/modes-identical.test.ts` (and the hand-off list in
  `tests/boot-state/` if it enumerates ROMs) to cover the new ROMs in both start modes

### 2d – Adapter (research.md R1, R2, R4, R6, R11)

- [ ] T017 Write `tests/emulator/inspection.test.ts` (node environment) against ROMs from T013–T015.
  For `inspect-mem`, after it reaches its loop:
  - `rom` equals the ROM file bytes and is the same reference in two snapshots.
  - `romBank` is 3.
  - `cartRam` has `bankCount` 4, a distinct pattern per bank, `bank` as left by the ROM and
    `enabled === false`.
  - `wram`/`hram`/`ie` patterns match.
  - `vram`, `wram` and `oam` are copies: changing them does not change the next snapshot.

  For the `mbc-none` ROM, `cartRam === null`.

  DIV in `io[0x04]` changes between two frames, and equals the value the CPU would read via `dmg_peek`
  at the same moment (test-only comparison).

  For `inspect-regs` with `HALTED=1`, `cpu` is `{ ime: true, halted: true }`. For the default build it
  is `{ ime: false, halted: false }`.
- [ ] T018 Build `inspection` in `src/adapters/emulator/sameboy/sameboy-emulator.ts`:
  - Keep a private copy of the ROM per `loadRom`.
  - Read the areas via `_dmg_area` with `HEAPU8.slice`, plus `_dmg_io`, `_dmg_ie`, `_dmg_banks`,
    `_dmg_cart_ram_enabled` and `_dmg_cpu_flags`.
  - Only when the hub asks for it (T009).
  - Rewrite `changedRanges()` to read from the same direct copies instead of `_dmg_peek` (VRAM, WRAM,
    OAM, I/O, HRAM, IE mapped back to `$8000–$FFFF`; echo and `$FEA0–$FEFF` excluded).
  - Call `frameState.prime(snapshot)` after `loadRom`, `reset` and `halt`.

  Then:
  - Enable case (c) and un-fail case (b) of T001.
  - Make T017 green.
  - Deliberately adapt `tests/emulator/sameboy-adapter.test.ts` and
    `tests/emulator/service-contract.test.ts` where they assert `changedMemory` values affected by
    research.md R2/R3, with a comment explaining the change.
- [ ] T019 Check against the core source how MBC2 RAM (512 × 4 bit) and MBC3 RTC registers are laid out
  in `mbc_ram` / `mbc_ram_size` (`.build/sameboy/Core/memory.c`, `mbc.c`). Record the findings with
  file:line in `specs/004-m1b-memory-views/research.md` R11 and mirror them in `CartRamSnapshot` doc
  comments in `src/core/events/frame-state.ts`. RTC registers are not shown in M1b.

### 2e – Vertrag und App (contracts/view-contract.md)

- [ ] T020 [P] Extend `tests/contract/view-contract.test-d.ts` with three checks: `{ type: 'RequestSnapshot' }`
  is a `ViewAction`, `{ type: 'EmulatorReset' }` is a `DomainEvent`, and `ViewDefinition.inspects` is
  optional and only `true`.
- [ ] T021 Add `RequestSnapshot` to `src/core/view/view-actions.ts`, `EmulatorReset` to
  `src/core/events/domain-events.ts`, and `inspects?: true` to `ViewDefinition` in
  `src/core/view/view-contract.ts`. Update the `ViewAction` switch in
  `src/app/session/emulator-session.ts` so `RequestSnapshot` is ignored there, like `SetFrameRate`.
- [ ] T022 Write a test in `tests/unit/emulator-session.test.ts`: `Reset` publishes `EmulatorReset` while
  running and while paused. Then publish it after `emulator.reset()` in
  `src/app/session/emulator-session.ts`.
- [ ] T023 Write tests in `tests/unit/slot-frame-source.test.ts` and `tests/contract/slot-view.test.tsx`
  for three slots with rates `full`, `reduced` 60 and `on-demand`:
  - A `RequestSnapshot` from the on-demand slot delivers exactly one snapshot to it.
  - The other two get 0 extra deliveries.
  - The 60-slot counter is not advanced: it still delivers on its 60th real frame.
  - After a reset (frame numbers restart at 0), the 60-slot still delivers on its 60th real frame; no
    real frame is dropped because its number repeats one seen before.
  - A hidden slot that requests gets nothing.
  - Two requests in one task cause one build.
- [ ] T024 Implement in `src/app/layout/slot-frame-source.ts`: track the last delivered frame number and
  ignore upstream deliveries with `upstream.getDeliveryKind() === 'request'` unless this slot has a
  pending request (never compare frame numbers, contracts/frame-state.md rule 7). Route
  `RequestSnapshot` in `src/app/layout/Slot.tsx` to `frameSource.requestSnapshot()`. T023 must be green.
- [ ] T025 Write `tests/unit/frame-demand.test.ts`: inspection demand is on only while at least one
  registered source is visible, subscribed and flagged `inspects`. Then extend
  `src/app/layout/frame-demand.ts` and `SlotFrameSource` with an `inspects` flag set by `Slot.tsx` from
  `view.definition.inspects`, calling `publisher.setInspectionDemand`.
- [ ] T026 Write the addendum to `docs/adr/0008-eventmodell-und-offline.md` (German), section "Nachtrag
  M1b (2026-10-26)". It covers:
  - `FrameSnapshot.inspection` built on demand, read without side effects (research.md R1/R4/R5)
  - `RequestSnapshot` per slot with coalescing
  - `EmulatorReset`
  - no third channel

### 2f – Gemeinsame Domänenmodule und View-Bausteine

- [ ] T027 [P] Write `tests/unit/inspect-changes.test.ts`. Then implement `src/core/inspect/changes.ts`:
  `diffBytes(prev: Uint8Array | null, next: Uint8Array): Set<number>` (empty set when `prev` is null or
  the lengths differ).
- [ ] T028 [P] Write `tests/unit/inspect-palette.test.ts` (table cases incl. `$E4` identity and `$1B`
  reversal). Then implement `src/core/inspect/palette.ts` `applyPalette(colorIndex: 0|1|2|3, palette:
  number): 0|1|2|3`, with bit pairs per Pan Docs "Palettes" (fetch the page and cite it).
- [ ] T029 Create `src/views/inspect-common/rate.ts`:
  - `type InspectRate = 'live' | 'second' | 'manual'`
  - `INITIAL_RATE = 'second'`
  - `toPublishRate`: `'live'` → `{ kind: 'reduced', everyNthFrame: 6 }`, `'second'` →
    `{ kind: 'reduced', everyNthFrame: 60 }`, `'manual'` → `{ kind: 'on-demand' }` (research.md R7)
  - `parseRate(json)`: invalid → `'second'`

  Add unit tests in `tests/unit/inspect-rate.test.ts`.
- [ ] T030 Create the hook `src/views/inspect-common/useInspection.ts` and test it in
  `tests/unit/view-use-inspection.test.tsx` with a fake context. It returns
  `{ snapshot, inspection, session }` via `useSyncExternalStore` and:
  - dispatches `SetFrameRate` on mount and on rate change;
  - dispatches `RequestSnapshot` on mount, when `visible` turns true, and on `RunStateChanged` to
    `paused`/`halted`/`empty`, `RomLoaded`, `EmulatorReset` and `EmulatorHalted`;
  - processes nothing while `visible` is false.
- [ ] T031 [P] Create `src/views/inspect-common/RateBar.tsx` (+ CSS module): three large buttons "Live", "1/s",
  "Manual" with `aria-pressed`, tokens only. Create `src/views/inspect-common/Pager.tsx`: "Previous page",
  "n / m", "Next page", the same pattern as `src/views/memory-map/MemoryMapView.tsx`, extracted without
  changing Memory Map behavior.
- [ ] T032 [P] Create `src/views/inspect-common/header.ts` with `inspectHeaderActions()` returning
  `[{ id: 'refresh', label: 'Refresh', action: { type: 'RequestSnapshot' } }]`. Create
  `src/views/inspect-common/Notice.tsx` showing "No ROM loaded" (FR-015) or "Waiting for data".
- [ ] T033 Create `src/views/inspect-common/TileCanvas.tsx`, tested in
  `tests/unit/view-tile-canvas.test.tsx`:
  - draws an array of color indices (0–3) at an integer scale ≥ `--tile-pixel-min` on a canvas;
  - uses gray levels from `readShades('--game-eink-shade-')` (`src/views/shades.ts`, FR-014);
  - `image-rendering: pixelated`;
  - reports tapped pixel coordinates via a callback.
- [ ] T034 Create the test helper `tests/support/dispatch-spy.ts`: a fake `ViewContext` whose `dispatch`
  records every action, plus `expectOnlyInspectActions(spy)`, which fails on any action type other than
  `SetFrameRate` and `RequestSnapshot` (FR-002). Every view test (T039, T047, T051, T056, T061) uses it
  after clicking through all of the view's controls. A type test cannot prove this, because
  `ViewContext.dispatch` accepts every `ViewAction` (analysis finding U1).

**Checkpoint**: Inspektionsdaten fließen nebenwirkungsfrei, Anforderungen pro Slot funktionieren, die
Test-ROMs sind da – Views können beginnen.

---

## Phase 3: User Story 1 – Speicher als Hex-Werte ansehen (Priority: P1) 🎯 MVP

**Goal**: View „Hex“ mit allen Bereichen, Bankwahl, Blättern, Sprung zur Adresse, Registernamen im
I/O-Bereich, Änderungsmarkierung.

**Independent Test**: `inspect-mem` laden. Der Hex-View zeigt an den dokumentierten Adressen genau die
erwarteten Werte, in jeder ROM- und RAM-Bank.

### Tests für User Story 1

- [ ] T035 [P] [US1] Write `tests/unit/inspect-io-registers.test.ts`. It asserts 43 named DMG entries
  from `$FF00` to `$FF50` exactly as in research.md R9:
  - `Wave RAM` covers `$FF30–$FF3F`.
  - CGB-only addresses (`$FF4D`, `$FF4F`, `$FF51`–`$FF55`, `$FF68`–`$FF6C`, `$FF70`) have no name.
  - `$FF03` has no name.
- [ ] T036 [P] [US1] Write `tests/unit/inspect-areas.test.ts` for `bytesOf(area, bank, inspection)`:
  - ROM bank 0 maps to `rom[0x0000..0x3FFF]` and bank n to `rom[n*0x4000..]`.
  - A bank ≥ ROM size → `null`.
  - Cartridge RAM bank n maps to `bytes[n*0x2000..]`, and `null` when there is no cartridge RAM.
  - VRAM/WRAM/OAM/IO/HRAM/IE carry their base addresses from `MEMORY_MAP` (`src/core/rom/memory-map.ts`).
- [ ] T037 [P] [US1] Write `tests/unit/inspect-hex-layout.test.ts`:
  - `bytesPerRow(width, charWidth)` returns 16 when a full 16-byte row incl. address column fits,
    otherwise 8.
  - `alignTop(address, bytesPerRow)` rounds down to a multiple.
  - Switching from 16 to 8 and back keeps the current top address on the shown page (FR-005).
- [ ] T038 [P] [US1] Write `tests/unit/view-hex-state.test.ts`:
  - Initial state is `{ area: 'wram', romBank: 0, ramBank: 0, topAddress: 0xC000, rate: 'second',
    selected: null }`.
  - Round trip `deserialize(serialize(s))`.
  - Invalid JSON falls back per field.
- [ ] T039 [P] [US1] Write `tests/unit/view-hex.test.tsx` with real snapshots from `inspect-mem` (built
  via the adapter in a node-backed helper, or recorded fixture produced by a script in `tests/support/`;
  never committed ROM bytes):
  - Rows show address and bytes in hex.
  - ROM bank 5 shows the bank marker.
  - The mapped bank is marked by text, e.g. "mapped".
  - RAM bank 2 shows its pattern and "locked".
  - I/O shows `$FF40 LCDC` and no name at `$FF03`, plus the note "Internal emulator values; unused bits
    may differ from what the CPU reads.".
  - A changed byte after the next snapshot gets `data-changed` and an inverted/bordered class.
  - Tapping a byte only sets `selected`; nothing is dispatched besides rate and refresh.
  - Jump to `$C080` shows that page in one render (SC-006).
  - Without a ROM it shows "No ROM loaded".
  - A ROM without cartridge RAM does not offer the area.

### Implementation für User Story 1

- [ ] T040 [P] [US1] Implement `src/core/inspect/io-registers.ts`: `IO_REGISTER_NAMES` from Pan Docs
  `Hardware_Reg_List.md` (models "All"/"DMG" only), with a source comment carrying the Pan Docs commit,
  plus `ioRegisterName(address): string | null`. T035 must be green.
- [ ] T041 [P] [US1] Implement `src/core/inspect/areas.ts`: the area list `'rom' | 'vram' | 'cart-ram' |
  'wram' | 'oam' | 'io' | 'hram' | 'ie'` with base address, size and bank count derived from
  `MEMORY_MAP` and the inspection snapshot, and `bytesOf(...)`. T036 must be green.
- [ ] T042 [P] [US1] Implement `src/core/inspect/hex-layout.ts`. T037 must be green.
- [ ] T043 [US1] Create `src/views/hex/definition.ts` (`typeId: 'hex'`, `title: 'Hex'`, `icon: 'hex'`,
  `inspects: true`, `headerActions: inspectHeaderActions`). Implement state parsing as in data-model.md:
  - "Ist die Bank zu groß für das ROM bzw. den RAM, wird sie beim Anzeigen auf 0 gesetzt"
  - "`topAddress` liegt im Bereich und wird auf die Zeilenbreite abgerundet"

  T038 must be green.
- [ ] T044 [US1] Implement `src/views/hex/HexView.tsx` (+ `HexView.module.css`). It uses `useInspection`
  and contains:
  - an area selector and a bank selector (large buttons or `<select>`, ROM/RAM only, invalid banks
    disabled);
  - rows measured with `ResizeObserver`, so the page fills the slot without scrolling;
  - bytes per row from `hex-layout.ts` using `--font-family-mono` / `--font-size-mono-min`;
  - `Pager`, and a jump input (hex address, applies on submit, clamps to the area);
  - register names in the I/O area, plus the note for I/O and for VRAM/OAM ("Internal state, also while
    the LCD blocks CPU access.");
  - "mapped" / "locked" markers as text;
  - change marks via `diffBytes` against the last shown page;
  - `RateBar`.

  T039 must be green.
- [ ] T045 [US1] Register the Hex view in `src/app/views/m1b-views.ts`
- [ ] T046 [US1] Write `tests/e2e/m1b-hex.spec.ts` (load `inspect-mem` through the ROM Info file input
  like the M1 specs):
  - Switch a slot to "Hex" via the header arrows.
  - The start rate shows "1/s" as pressed.
  - WRAM `$C000` shows the documented byte.
  - Switch to ROM bank 3 → "mapped".
  - Cartridge RAM bank 1 → pattern and "locked".
  - Jump to `$FF40` → row shows `LCDC`.
  - At a 2-slot portrait viewport of 412 × 915 CSS px (Palma-like; note it as an approximation), rows
    have 8 bytes; maximized, 16. No horizontal scrollbar (`scrollWidth <= clientWidth`).

**Checkpoint**: US1 ist eigenständig nutzbar. Mit ihm lässt sich jedes ROM ansehen.

---

## Phase 4: User Story 2 – CPU-Register und Flags ansehen (Priority: P1)

**Goal**: View „Registers“ mit A–L, SP, PC, Paaren, Flags, IME und HALT.

**Independent Test**: Mit `inspect-regs` zeigt der View genau die dokumentierten Werte, mit
`inspect-regs-halted` „IME on“ und „HALT on“.

- [ ] T047 [P] [US2] Write `tests/unit/view-registers.test.tsx` with snapshots from `inspect-regs` and
  `inspect-regs-halted`:
  - A, F, B, C, D, E, H, L as `$XX`; SP, PC, BC, DE, HL as `$XXXX`.
  - Flags Z N H C shown as set/clear by characters (e.g. "Z ●" / "Z ○" plus text for screen readers),
    never by color alone.
  - IME and HALT each shown as "on"/"off" (FR-006).
  - A register changed between two snapshots is marked.
  - Paused: after `RunStateChanged` to `paused` exactly one `RequestSnapshot` is dispatched, and the
    values stay fixed until resumed (US2-AS2).
  - Initial state is `{ rate: 'second' }`.
- [ ] T048 [US2] Create `src/views/registers/definition.ts` (`typeId: 'registers'`, `title: 'Registers'`,
  `inspects: true`, state `{ rate }`) and `src/views/registers/RegistersView.tsx` (+ CSS module) using
  `snapshot.registers`, `snapshot.flags` and `inspection.cpu`. Values come from the same snapshot (FR-006).
  T047 must be green.
- [ ] T049 [US2] Register the view in `src/app/views/m1b-views.ts`, and
  write `tests/e2e/m1b-registers.spec.ts`. With `inspect-regs` loaded: values visible; Pause → values
  unchanged after 2 s; Resume.

**Checkpoint**: Alle P1-Stories sind fertig.

---

## Phase 5: User Story 3 – Kacheln im VRAM ansehen (Priority: P2)

**Goal**: View „Tiles“ mit 384 Kacheln in drei Blöcken, Detail per Antippen, Schalter „Raw“ / „BGP“.

**Independent Test**: `inspect-gfx` laden. Jede Kachel stimmt pixelgenau mit dem dokumentierten Muster
überein.

- [ ] T050 [P] [US3] Write `tests/unit/inspect-tiles.test.ts`:
  - `decodeTile` on known 16-byte rows (bit 7 is the leftmost pixel, low byte is bit 0 of the color
    index, per Pan Docs "Tile Data").
  - `tileAddress(0) = $8000`, `tileAddress(128) = $8800`, `tileAddress(383) = $97F0`.
- [ ] T051 [P] [US3] Write `tests/unit/view-tiles.test.tsx` with `inspect-gfx`:
  - All 384 tiles are drawn and grouped in three labelled blocks of 128 ($8000, $8800, $9000).
  - The pixels of tile 0, 200 and 383 equal `decodeTile` output.
  - Toggling "BGP" maps them via `applyPalette`.
  - The initial palette is `'raw'`.
  - Tapping a tile shows number, address and 16 bytes in hex.
  - Pages are used when the slot is too small for `--tile-pixel-min`.
- [ ] T052 [US3] Implement `src/core/inspect/tiles.ts`. T050 must be green.
- [ ] T053 [US3] Create `src/views/tiles/definition.ts` (`typeId: 'tiles'`, state `{ rate, palette:
  'raw' | 'bgp', page, selected: number | null }` with `selected` in 0–383, start values per
  data-model.md, `inspects: true`) and `src/views/tiles/TilesView.tsx` using `TileCanvas`, `Pager`,
  `RateBar`. T051 must be green.
- [ ] T054 [US3] Register the view, and write `tests/e2e/m1b-tiles.spec.ts`:
  load `inspect-gfx`, switch to Tiles, tap a tile, and check that the detail shows its number. Take a
  grayscale screenshot and check that the selection mark is visible without color.

---

## Phase 6: User Story 4 – Hintergrund- und Fenster-Karte ansehen (Priority: P2)

**Goal**: View „Tilemaps“ mit BG- und Fenster-Karte nach LCDC, Bildschirmausschnitt mit Umbruch,
Fensterposition.

**Independent Test**: Mit `inspect-gfx` und `inspect-gfx-tall` stimmt die Karte pixelgenau. Der Rahmen liegt
bei (SCX, SCY) mit Umbruch.

- [ ] T055 [P] [US4] Write `tests/unit/inspect-tilemap.test.ts`:
  - `mapBase(lcdc, 'background')` and `mapBase(lcdc, 'window')` for LCDC bits 3/6.
  - `tileIndexFor(entry, lcdc)` with the `$8000` method (entry 0 → tile 0, 255 → 255) and the `$8800`
    method (entry 0 → tile 256, 127 → 383, 128 → 128, 255 → 255) per Pan Docs "Tile Data".
  - `viewport(100, 200)` → wrapped rectangles covering 160 × 144 within 256 × 256.
  - `windowOrigin(87, 40)` → (80, 40).
- [ ] T056 [P] [US4] Write `tests/unit/view-tilemaps.test.tsx` with `inspect-gfx` and `inspect-gfx-tall`:
  - The 256 × 256 picture equals the composition from `decodeTile` and the map.
  - The viewport frame is drawn as a border (not color) at the wrapped position.
  - "Window" shows the window map and its origin.
  - With LCDC.5 cleared in a synthetic snapshot it shows the text "Window off".
  - Tapping shows map position (x, y), map address and tile number (US4-AS4).
  - Initial state is `{ rate: 'second', palette: 'raw', map: 'background', selected: null }`.
- [ ] T057 [US4] Implement `src/core/inspect/tilemap.ts`. T055 must be green.
- [ ] T058 [US4] Create `src/views/tilemaps/definition.ts` (`typeId: 'tilemaps'`, `inspects: true`, state per
  data-model.md, `selected` in 0–1023) and `src/views/tilemaps/TilemapsView.tsx`. It scales the map to fit
  the slot at an integer factor, or downscales with the note "Zoom for full size"; the zoom button from
  M1 maximizes. T056 must be green.
- [ ] T059 [US4] Register the view, and write
  `tests/e2e/m1b-tilemaps.spec.ts`: switch between background and window and check the viewport frame.

---

## Phase 7: User Story 5 – Sprites (OAM) ansehen (Priority: P2)

**Goal**: View „Sprites“ mit 40 Einträgen, Feldern, Kachelbild (8×8 / 8×16), Sichtbarkeit und Palette.

**Independent Test**: Mit `inspect-gfx` und `inspect-gfx-tall` zeigt der View genau die dokumentierten
OAM-Werte.

- [ ] T060 [P] [US5] Write `tests/unit/inspect-oam.test.ts` for `decodeObject(oam, i, lcdc)`:
  - Fields `y, x, tile`, priority (bit 7), flipY (6), flipX (5), palette (bit 4 → 0/1).
  - With 8×16 the tiles are `[tile & 0xFE, tile | 0x01]`.
  - `visible` is false for Y = 0, Y = 160, X = 0 and X = 168, and true for Y = 16, X = 8.
  - With 8×16, Y = 2 is visible and Y = 0 is not (Pan Docs "OAM" examples).
- [ ] T061 [P] [US5] Write `tests/unit/view-sprites.test.tsx` with `inspect-gfx` and `inspect-gfx-tall`:
  - Each of the 40 entries shows number, Y, X, tile, priority, flip X/Y and palette as text.
  - The tile image is 8×8 or 8×16.
  - Hidden entries say "hidden".
  - "OBP" applies OBP0/OBP1 per entry.
  - Initial palette is `'raw'`.
  - The list is paged with no scrolling.
  - A changed field is marked.
- [ ] T062 [US5] Implement `src/core/inspect/oam.ts`. T060 must be green.
- [ ] T063 [US5] Create `src/views/sprites/definition.ts` (`typeId: 'sprites'`, `inspects: true`, state
  `{ rate, palette: 'raw' | 'obp', page }`) and `src/views/sprites/SpritesView.tsx`. T061 must be green.
- [ ] T064 [US5] Register the view, and write
  `tests/e2e/m1b-sprites.spec.ts`: page through the list and check the "hidden" label.

---

## Phase 8: User Story 6 – Ansichten auf E-Ink und neben dem Spiel nutzen (Priority: P2)

**Goal**: Raten, Refresh, keine Updates im Hintergrund, volle Geschwindigkeit, Messwerte für SC-002.

**Independent Test**: Speicher-View neben dem Screen. Neuzeichnungen pro Sekunde zählen, ausgeblendet 0,
Diagnosewerte prüfen, Graustufen-Screenshot.

- [ ] T065 [P] [US6] Write `tests/unit/emulator-session.test.ts` (extend) and
  `tests/emulator/sameboy-adapter.test.ts` (extend):
  - The adapter exposes `frameWorkP95Ms()`, which measures `_dmg_run_frame` plus `offer()`, and
    `emulatedFps()`, which counts frames per second over the last 60 s.
  - The session fills `diagnostics.frameWorkP95Ms` and `diagnostics.emulatedFps`.
- [ ] T066 [US6] Implement the measurement in `src/adapters/emulator/sameboy/sameboy-emulator.ts`, extend
  `Diagnostics` in `src/core/view/view-contract.ts` with `frameWorkP95Ms: number | null` and
  `emulatedFps: number | null`, and wire it in `src/app/session/emulator-session.ts`. Show both on the
  `header` page of `src/views/rom-info/RomInfoView.tsx` with `data-testid="frame-work"` and
  `"emulated-fps"`, and extend `tests/e2e/m1-rom-info.spec.ts`. T065 must be green (research.md R12).
- [ ] T067 [P] [US6] Write `tests/e2e/m1b-rates.spec.ts` with Screen and Hex visible and `marker` or
  `inspect-mem` running:
  - Count Hex re-renders via a `data-frame` attribute over 5 s:
    - "1/s" → at most 6
    - "Live" → between 30 and 60
    - "Manual" → 0, then exactly +1 after "Refresh"
  - Hide the Hex slot via the zoom on Screen → 0 updates.
  - Reload the page → the chosen rate is restored (US6-AS2).
  - A new Hex slot starts at "1/s" (US6-AS6).
  - Screen keeps full rate: the ROM Info `emulated-fps` is at least 55 in headless Chromium, noted as
    an approximation.
- [ ] T068 [P] [US6] Write `tests/e2e/m1b-eink.spec.ts`. For each of the five views:
  - No CSS transition or animation (same check as `tests/e2e/m1-eink.spec.ts`).
  - At the 2-slot portrait viewport from T046, no horizontal scrolling in the view
    (`scrollWidth <= clientWidth` for the slot content and the page), covering the edge case "Sehr kleines
    Display" and SC-005 automatically (analysis finding C1).
  - In a grayscale screenshot, the changed, selected, mapped and locked marks are detectable by pixel
    difference from the unmarked state.
- [ ] T069 [US6] Write `tests/e2e/m1b-pause.spec.ts`: with Hex on "1/s", Pause shows the paused state.
  The value in a frequently changing WRAM cell, or DIV in I/O, equals the value after a manual Refresh
  while paused. Reset while running updates the view at once via `EmulatorReset`.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T070 [P] Update arc42 (German):
  - `docs/arc42/05-bausteinsicht.md`: `src/core/inspect/`, the five views, `inspect-common`.
  - `docs/arc42/08-querschnittliche-konzepte.md`: reading without side effects (links to research.md
    R1–R3); snapshot request on pause, reset and refresh; demand-based inspection. There is no chapter 6
    file yet; do not create one.
  - `docs/arc42/09-architekturentscheidungen.md`: ADR-0008 addendum.
- [ ] T071 [P] Update `docs/arc42/01-einfuehrung.md` (M1b status) and `CLAUDE.md` only if commands or
  directories changed (no new npm scripts are expected)
- [ ] T072 Run the full quickstart (`specs/004-m1b-memory-views/quickstart.md`): `npm run check`,
  `npm run core:verify`
- [ ] T073 Create `docs/abnahme/m1b.md` with a table of all FR/SC including evidence (test file or device
  check) and the result of T001.
- [ ] T074 Device tests per quickstart "Manuelle Prüfungen am Gerät". Record device model,
  Android/Chrome version and measurement duration for:
  - the smartphone (SC-002: `frameWorkP95Ms`, `emulatedFps`)
  - Boox Palma
  - Boox Go Color 7 (SC-005, live rate)

  Measure the real CSS viewport (`innerWidth` × `innerHeight`, `devicePixelRatio`) of the Boox Palma and
  the Boox Go Color 7 in Chrome, record it, and replace the approximate viewport in T046/T068 with the
  measured Palma values (analysis finding A1). Adjust `--font-size-mono-min` / `--tile-pixel-min` if
  needed (a code commit, so +1 patch).
- [ ] T075 Close the open points in `specs/004-m1b-memory-views/research.md` (strike through with a
  reference)
- [ ] T076 On acceptance by the project owner, set the version to `0.4.0` in `package.json` and mark the
  spec status "Accepted" in `specs/004-m1b-memory-views/spec.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → User Stories → **Polish (Phase 9)**
- T001 runs **before** any change to adapter or wrapper, because it fixes the M1 baseline.
- Within Phase 2:
  - T004 → T005 → T018
  - T007 → T008 → T009 → T018
  - T012 → T013/T014/T015 → T016 (Startmodi) und T013–T015 → T017 → T018
  - T020 → T021 → T022
  - T021 → T023 → T024 → T025
  - T029 → T030 → T031–T033
- **US1** (Phase 3): nach Phase 2 – MVP
- **US2** (Phase 4): nach Phase 2; unabhängig von US1, außer `m1b-views.ts`. Nacheinander mergen.
- **US3** (Phase 5): nach Phase 2
- **US4** (Phase 6): nach US3, weil `tiles.ts` (T052) verwendet wird
- **US5** (Phase 7): nach US3 (`tiles.ts`)
- **US6** (Phase 8): Diagnose (T065, T066) nach Phase 2. Die E2E-Tests T067–T069 laufen nach US1 und
  nutzen den Hex-View. T068 läuft nach allen Views.

### Within Each User Story

- Tests zuerst schreiben und fehlschlagen lassen, dann umsetzen.
- Reihenfolge: Domänenmodul (`src/core/inspect/`) vor View-Definition, Definition vor Komponente,
  Komponente vor Registrierung und E2E.

### Parallel Opportunities

- Phase 1: T002, T003 parallel nach T001
- Phase 2:
  - T006 im selben Commit wie T005; T007–T010 parallel zu T004–T006
  - T011–T015 parallel
  - T020 parallel zu T007
  - T027, T028 parallel
  - T031, T032 parallel
- US1: T035–T039 parallel; T040–T042 parallel
- US3/US4/US5: die Tests T050/T051, T055/T056 und T060/T061 parallel; nach T052 laufen US4 und US5
  parallel
- US6: T065 parallel zu US1. T067 und T068 sind parallel, sobald die Views registriert sind.

## Parallel Example: User Story 1

```text
Task: "Write tests/unit/inspect-io-registers.test.ts"
Task: "Write tests/unit/inspect-areas.test.ts"
Task: "Write tests/unit/inspect-hex-layout.test.ts"
Task: "Write tests/unit/view-hex-state.test.ts"
Task: "Write tests/unit/view-hex.test.tsx"
```

## Implementation Strategy

### MVP First (US1)

1. Phase 1 + 2, inklusive WASM-Neubau, Identitätstest und ADR-0008-Nachtrag
2. US1 → Hex-View
3. **Stop und prüfen**: `npm run check`, `npm run test:e2e -- m1b-hex`, Palma im Hochformat

### Incremental Delivery

1. US2 → Registers (alle P1-Stories fertig)
2. US3 → Tiles
3. US4 + US5 → Tilemaps und Sprites
4. US6 → Raten, Diagnose, E-Ink-Prüfungen
5. Polish → arc42, Gerätetests, Abnahme, Version `0.4.0`
