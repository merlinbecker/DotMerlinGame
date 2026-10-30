# Implementation Plan: M3 – Disassembler und Roundtrip

**Branch**: `feature/firstSteps` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

## Summary

Ein reiner, konservativer Disassembler in `src/core/disasm/` macht aus einem ROM ein Projekt. Der Import baut das Ergebnis sofort und vergleicht es mit dem
ROM. Importierte Projekte bauen ohne `rgbfix`, damit auch ungültige Header unverändert bleiben.

M2 ist zum Planungszeitpunkt gebaut, aber noch nicht abgenommen; der Projektinhaber testet parallel und hat den Start von M3 ausdrücklich beauftragt.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Node.js 24

**Primary Dependencies**: keine neuen; RGBDS-WASM aus M2

**Storage**: Projektspeicher aus M2, kein ROM

**Testing**: Vitest (Roundtrip mit WASM unter Node), Playwright

**Target Platform**: aktuelles Chrome, auch Android und E-Ink

**Project Type**: Single-Page-Web-App, rein clientseitig

**Performance Goals**: 32 KiB unter 10 s, 1 MiB unter 60 s auf dem Smartphone. Spike: 1 MiB baut in etwa 0,7 s unter Node

**Constraints**: keine Heuristiken, kein ROM im Projekt, keine Disassembly im Repo, offline

**Scale/Scope**: 1 Aktion, 1 Einstellung, 3 reine Module, 1 Knopf im Project-View, 1 lokales Prüfskript

## Constitution Check

| Prinzip | Prüfung | Status |
|---|---|---|
| I. Quelltext als einzige Wahrheit | Das ROM wird nicht aufbewahrt. **Load ROM** bleibt vorerst als Übergang, ADR-Nachtrag (R8) | ✅ mit Auflage |
| II, III, IV | Reine Module im Core, nur Union-Erweiterungen, Views nur über `dispatch` | ✅ |
| V. E-Ink-first | Fortschritt als Text, keine Animation | ✅ |
| VI. Lizenzsauberkeit | Kein Fremdcode. Kein Disassembler nachgebaut, Tabelle aus Doku und per `rgbasm` geprüft | ✅ |
| VII. Hardware-Treue | Importierte Projekte behalten den Header des Originals; `fixHeader` ist sichtbar umschaltbar | ✅ |
| VIII. Tests | Siehe [quickstart.md](quickstart.md) | ✅ |
| IX, X | Offline, Fakten aus Doku und Spike | ✅ |
| Reihenfolge | M2-Abnahme steht aus; Start auf Auftrag des Projektinhabers. Keine Heuristiken, kein Debugger | ✅ begründet |

Nach Phase 1 erneut geprüft: unverändert erfüllt.

## Project Structure

```text
specs/003-m3-disassembler-roundtrip/ plan.md research.md data-model.md quickstart.md contracts/ tasks.md
src/core/disasm/              opcodes.ts, analyze.ts, generate.ts
src/core/project/model.ts     fixHeader, RomImportResult
src/adapters/assembler/rgbds/ pipeline.ts (ohne rgbfix bei fixHeader false)
src/adapters/archive/         fixHeader im ZIP
src/app/session/              project-session.ts (ImportRom)
src/views/project/            Import ROM, Ergebnis, Schalter
scripts/roundtrip-local.ts
tests/assembler/opcodes.test.ts, tests/roundtrip/, tests/e2e/m3-import.spec.ts
docs/adr/0005-…               Nachtrag
docs/adr/0013-disassembler.md, docs/arc42/, docs/abnahme/m3.md
```

## Offene Punkte für den Projektinhaber

**Load ROM** bleibt, bis du anders entscheidest (research.md R8). Alles andere blockiert nicht.

## Complexity Tracking

| Abweichung | Warum nötig | Einfachere Alternative verworfen, weil |
|---|---|---|
| `fixHeader` als neue Einstellung | Byte-Identität bei ungültigem Header | Bytes nachträglich patchen wäre kein reiner Build |
| Start vor der M2-Abnahme | Ausdrücklicher Auftrag | Warten blockiert ohne Nutzen, M2-Fehler werden separat behoben |
