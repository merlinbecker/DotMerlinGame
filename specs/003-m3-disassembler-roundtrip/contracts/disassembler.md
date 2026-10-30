# Vertrag: Disassembler (M3)

```ts
// src/core/disasm/disassemble.ts: pure, no framework, no adapter
export function analyze(rom: Uint8Array): Analysis;
export function generateSource(rom: Uint8Array, analysis: Analysis, name: string): Omit<Project, 'id'>;
```

## Neue Bausteine

```ts
// ViewAction
| { readonly type: 'ImportRom'; readonly bytes: Uint8Array; readonly fileName: string }

// ProjectState
readonly romImport: { readonly status: 'idle' } | { readonly status: 'running'; readonly bank: number; readonly banks: number } | { readonly status: 'done'; readonly result: RomImportResult };
```

## Regeln

1. `ImportRom` legt ein neues Projekt an und veröffentlicht `ProjectChanged` (US1-AS1). Es startet kein ROM.
2. Das ROM bleibt nur bis zum Ende des Vorgangs im Speicher, nie im Projekt oder im Speicher des Geräts (FR-008).
3. Header `$0100–$014F` ist ein eigener, kommentierter Abschnitt (FR-006).
4. Jede Bank ist eine eigene Section und Datei (FR-007).
5. Die Ausgabe nennt keine Fremdtexte. Quelltext aus fremden ROMs bleibt auf dem Gerät.
