# Vertrag: Ports (M2)

Erweitert `src/core/ports/`. Fremdcode bleibt in `src/adapters/`.

```ts
// assembler.ts
export interface Diagnostic {
  readonly file: string | null; // was string
  readonly line: number | null; // was number
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly tool: 'rgbasm' | 'rgblink' | 'rgbfix';
}

export interface BuildResult {
  readonly success: boolean;
  readonly rom?: Uint8Array;
  readonly symbols?: string;
  readonly map?: string;
  readonly diagnostics: readonly Diagnostic[];
  readonly durationMs: number;
  /** Set when the time limit ended the build (research.md R4). */
  readonly timedOut?: true;
}

export interface AssemblerPort {
  /** Loads and compiles the tools ahead of time, so a build works once the network is gone. */
  prepare(): Promise<void>;
  build(files: readonly SourceFile[], settings: ProjectSettings): Promise<BuildResult>;
}

// project-store.ts
export interface Project {
  readonly id: string;
  readonly name: string;
  readonly settings: ProjectSettings;
  readonly files: readonly SourceFile[];
}

// archive.ts: errors instead of partial results
export type ArchiveRejectReason =
  | 'not-a-zip' | 'no-project-file' | 'unknown-format' | 'unsafe-path' | 'duplicate-path' | 'too-large' | 'too-many-files';

export class ArchiveRejectedError extends Error {
  readonly reason: ArchiveRejectReason;
}
```

## Pflichten des Adapters

1. Pipeline: `rgbasm --color never -o …`, `rgblink -o … -n … -m …`, `rgbfix -v -p 0xFF …` plus Werte aus den
   Einstellungen. Bricht bei der ersten fehlgeschlagenen Stufe ab; `success` ist dann `false` und `rom` fehlt.
2. Kein Netzwerk während `build`.
3. Der Rückgabewert von `build` wirft nicht bei Quelltextfehlern. Nur ein Defekt des Werkzeugs führt zu einer
   Rejection.
4. `exportProject` und `importProject` sind verlustfrei für alle Dateien; `importProject` verändert keinen
   gespeicherten Zustand (FR-007, FR-008).
5. `SaveFile`-Fehler wegen vollem Speicher kommen als `StorageFullError` (wie M1).
