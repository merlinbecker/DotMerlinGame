# Vertrag: Ports

Ort: `src/core/ports/`. Nur Interfaces, keine Implementierung in M0. Erste Fassung; der genaue
Umfang des Debug-Zugriffs (Speicher-Watch, Schreib-Breakpoints, Bank-Info) ist offener Punkt für M1/M4.

```ts
// emulator.ts
export type BootMode = 'own-boot-rom' | 'direct-start';
export interface EmulatorPort {
  loadRom(rom: Uint8Array, options: { bootMode: BootMode; hardwareChecks: boolean }): Promise<void>;
  run(): void;
  pause(): void;
  reset(): void;
  step(): void;
  setButton(button: Button, pressed: boolean): void;
  setBreakpoint(address: number, bank?: number): void;
  clearBreakpoint(address: number, bank?: number): void;
  readonly frameState: FrameStatePublisher;
  readonly events: DomainEventSubscriber;
}

// assembler.ts
export interface SourceFile { readonly path: string; readonly content: Uint8Array }
export interface Diagnostic { readonly file: string; readonly line: number; readonly severity: 'error' | 'warning'; readonly message: string }
export interface BuildResult {
  readonly success: boolean;
  readonly rom?: Uint8Array;      // nur Build-Ergebnis (Prinzip I)
  readonly symbols?: string;      // .sym
  readonly map?: string;          // .map
  readonly diagnostics: readonly Diagnostic[];
}
export interface AssemblerPort { build(files: readonly SourceFile[], entry: string): Promise<BuildResult> }

// project-store.ts
export interface ProjectSummary { readonly id: string; readonly name: string; readonly updatedAt: string }
export interface Project { readonly id: string; readonly name: string; readonly files: readonly SourceFile[] }
export interface ProjectStorePort {
  list(): Promise<readonly ProjectSummary[]>;
  load(id: string): Promise<Project | undefined>;
  save(project: Project): Promise<void>;
  remove(id: string): Promise<void>;
}

// archive.ts
export interface ArchivePort {
  exportProject(project: Project): Promise<Uint8Array>;
  importProject(zip: Uint8Array): Promise<Project>;
}
```

## Zusicherungen

1. Keine Datei in `src/core/ports/` importiert Fremdcode oder React (ESLint).
2. Keiner der Ports gibt ein ROM als bearbeitbares Projektartefakt zurück; ROMs entstehen nur in `BuildResult`.
