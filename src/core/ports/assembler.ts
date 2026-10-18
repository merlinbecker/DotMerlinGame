export interface SourceFile {
  readonly path: string;
  readonly content: Uint8Array;
}

export interface Diagnostic {
  readonly file: string;
  readonly line: number;
  readonly severity: 'error' | 'warning';
  readonly message: string;
}

/** A ROM only ever exists as build output (Constitution I). */
export interface BuildResult {
  readonly success: boolean;
  readonly rom?: Uint8Array;
  /** Symbol file (.sym) */
  readonly symbols?: string;
  /** Map file (.map) */
  readonly map?: string;
  readonly diagnostics: readonly Diagnostic[];
}

/** rgbasm → rgblink → rgbfix. */
export interface AssemblerPort {
  build(files: readonly SourceFile[], entry: string): Promise<BuildResult>;
}
