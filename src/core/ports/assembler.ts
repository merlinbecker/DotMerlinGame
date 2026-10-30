import type { ProjectSettings } from '../project/model.ts';

export interface SourceFile {
  readonly path: string;
  readonly content: Uint8Array;
}

export type DiagnosticTool = 'rgbasm' | 'rgblink' | 'rgbfix';

export interface Diagnostic {
  /** Innermost file; null if the tool names no location. */
  readonly file: string | null;
  /** 1-based; null if the tool names no location. */
  readonly line: number | null;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly tool: DiagnosticTool;
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
  readonly durationMs: number;
  /** The time limit ended the build (M2 research.md R4). */
  readonly timedOut?: true;
}

/** rgbasm → rgblink → rgbfix. Source errors are results, not rejections. */
export interface AssemblerPort {
  /** Loads and compiles the tools ahead of time, so a build works once the network is gone. */
  prepare(): Promise<void>;
  build(files: readonly SourceFile[], settings: ProjectSettings): Promise<BuildResult>;
}
