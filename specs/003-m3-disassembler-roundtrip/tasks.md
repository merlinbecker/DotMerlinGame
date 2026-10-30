---

description: "Task list for M3 – Disassembler und Roundtrip"
---

# Tasks: M3 – Disassembler und Roundtrip

**Input**: `specs/003-m3-disassembler-roundtrip/` ([plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md))

**Tests**: Pflicht (Constitution VIII), zuerst schreiben. Regeln zu Sprache, Tokens, Zugriffsgrenzen und Version wie in M2
(Stand `0.4.3`; Abnahme von M2 und M3 setzen die Minor-Stelle). Kein ROM und keine Disassembly fremder ROMs committen.

## Phase 1: Setup

- [X] T001 Add `fixHeader: boolean` to `ProjectSettings` in `src/core/project/model.ts` (start `true`), skip rgbfix in `src/adapters/assembler/rgbds/pipeline.ts` when false, read it as optional in `src/adapters/archive/fflate-archive.ts` (missing means `true`). Tests: `tests/assembler/rgbds.test.ts`, `tests/unit/archive-zip.test.ts`.
- [X] T002 Add `ImportRom` to `src/core/view/view-actions.ts`, `romImport` and `RomImportResult` to `src/core/project/model.ts`, extend `tests/contract/view-contract.test-d.ts`.

## Phase 2: Foundational

- [X] T003 Write `src/core/disasm/opcodes.ts`: all 256 base and 256 `$CB` opcodes with length and RGBDS syntax, from `gbz80(7)` and Pan Docs; the invalid opcodes as such; `$10` valid only with `$00`.
- [X] T004 Write `tests/assembler/opcodes.test.ts`: assemble every opcode with the WASM `rgbasm` and compare bytes (FR-011).

## Phase 3: User Story 2 – Konservative Analyse (P1)

**Independent Test**: Eigenes ROM mit bekannter Aufteilung; keine Daten als Code.

- [X] T005 [P] [US2] Write `tests/unit/disasm-analyze.test.ts` for every rule of research.md R3, then implement `src/core/disasm/analyze.ts`.
- [X] T006 [P] [US2] Write `tests/unit/disasm-generate.test.ts` (labels, header section, `db`/`ds`, one file per bank, a target inside an instruction stays a number), then implement `src/core/disasm/generate.ts`.

## Phase 4: User Story 1 – ROM als Projekt importieren (P1) 🎯 MVP

**Independent Test**: ROM importieren, Projekt erscheint, Build ist byte-identisch.

- [X] T007 [US1] Write `tests/unit/project-session.test.ts` (extend), then implement `ImportRom` in `src/app/session/project-session.ts`: progress per bank with a pause, unique name, `ProjectChanged`, verdict per research.md R6, no ROM kept, an empty file rejected.
- [X] T008 [US1] Add **Import ROM**, the progress and verdict as text, and the `fixHeader` switch to `src/views/project/ProjectView.tsx`; test in `tests/unit/view-project.test.tsx`.
- [X] T009 [US1] Write `tests/e2e/m3-import.spec.ts`: import a test ROM, verdict `identical`, build and export are byte-identical, the ZIP holds no ROM, the page answers during import.

## Phase 5: User Story 3 – Roundtrip als Qualitätsnachweis (P2)

**Independent Test**: Testsuite und lokaler Lauf.

- [X] T010 [US3] Replace the `it.todo` in `tests/roundtrip/roundtrip.test.ts`: every ROM in `tests/roms/build/` and `examples/hello`, byte-identical (SC-001), including invalid headers; a size that is no multiple of 16 KiB gives `padded`.
- [X] T011 [US3] Add `tests/roundtrip/known-split.test.ts`: a self-built ROM with known code and data, no data as code (SC-002). Sources only under `tests/roms/src/`.
- [X] T012 [US3] Add `scripts/roundtrip-local.ts` and `npm run roundtrip:local` for `roms/local/`, writing no files; extend `tests/tooling/gitignore.test.ts` (FR-010, SC-005); list the command in `CLAUDE.md`.

## Phase 6: Polish

- [X] T013 [P] Write `docs/adr/0013-disassembler.md`, the addendum in `docs/adr/0005-quelltext-einzige-wahrheit.md` (R8), and update arc42 chapters 5, 8, 9.
- [X] T014 Run `npm run check`; create `docs/abnahme/m3.md`.
- [ ] T015 Device tests SC-003 and SC-004 per quickstart.
- [ ] T016 On acceptance by the project owner, set the version and mark the spec status.

## Dependencies

T001, T002 → T003 → T004 → US2 → US1 → US3 → Polish. T005 and T006 are parallel. **MVP**: through T009.
