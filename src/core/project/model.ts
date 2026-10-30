import type { BuildResult, SourceFile } from '../ports/assembler.ts';
import type { ArchiveRejectReason } from '../ports/archive.ts';
import type { Project, ProjectSummary } from '../ports/project-store.ts';
import { isSafePath } from './paths.ts';

export const MAX_PROJECT_NAME_LENGTH = 64;
/** RGBDS rgbfix truncates longer titles (observed warning "Truncating title ... to 16 chars"). */
export const MAX_TITLE_LENGTH = 16;

export interface ProjectSettings {
  /** The file rgbasm translates; must be one of the project's files. */
  readonly entry: string;
  /** Cartridge title for rgbfix -t. */
  readonly title: string;
  /** rgbfix -m, names per `rgbfix -m help`. */
  readonly mbc: string;
  /** rgbfix -r */
  readonly ramSize: number;
}

export function defaultSettings(projectName: string): ProjectSettings {
  return { entry: 'main.asm', title: projectName.toUpperCase().slice(0, MAX_TITLE_LENGTH), mbc: 'ROM_ONLY', ramSize: 0 };
}

export type ProjectProblem = 'empty-name' | 'name-too-long' | 'no-files' | 'duplicate-path' | 'unsafe-path' | 'entry-missing';

/** The first rule the project breaks, or null. */
export function projectProblem(project: Pick<Project, 'name' | 'files' | 'settings'>): ProjectProblem | null {
  if (project.name.trim() === '') return 'empty-name';
  if (project.name.length > MAX_PROJECT_NAME_LENGTH) return 'name-too-long';
  if (project.files.length === 0) return 'no-files';
  const paths = project.files.map((file) => file.path);
  if (paths.some((path) => !isSafePath(path))) return 'unsafe-path';
  if (new Set(paths).size !== paths.length) return 'duplicate-path';
  if (!paths.includes(project.settings.entry)) return 'entry-missing';
  return null;
}

/** Text of a source file, or null if it is not valid UTF-8 (then the editor shows a note instead). */
export function decodeSource(file: SourceFile): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(file.content);
  } catch {
    return null;
  }
}

export function encodeSource(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export type BuildState =
  | { readonly status: 'idle' }
  | { readonly status: 'running' }
  | { readonly status: 'finished' | 'failed' | 'timed-out'; readonly result: BuildResult };

export type SaveState = 'saved' | 'pending' | 'failed';

export interface CursorTarget {
  readonly file: string;
  readonly line: number;
  /** Counts up, so tapping the same message twice moves the cursor again. */
  readonly sequence: number;
}

export type ProjectNotice =
  | { readonly kind: 'import-rejected'; readonly reason: ArchiveRejectReason }
  | { readonly kind: 'storage-full' };

export interface ExampleInfo {
  readonly id: string;
  readonly name: string;
}

/** The open project and everything around it; read-only for views. */
export interface ProjectState {
  readonly project: Project | null;
  readonly activeFile: string | null;
  readonly cursorTarget: CursorTarget | null;
  readonly saveState: SaveState;
  readonly build: BuildState;
  /** The source changed after the shown build result. */
  readonly buildIsStale: boolean;
  readonly projects: readonly ProjectSummary[];
  readonly examples: readonly ExampleInfo[];
  /** A pending import waits for ResolveImport: a project of this name exists. */
  readonly importConflict: string | null;
  readonly notice: ProjectNotice | null;
}

export const IDLE_PROJECT_STATE: ProjectState = {
  project: null,
  activeFile: null,
  cursorTarget: null,
  saveState: 'saved',
  build: { status: 'idle' },
  buildIsStale: false,
  projects: [],
  examples: [],
  importConflict: null,
  notice: null,
};
