import type { ProjectSettings } from '../project/model.ts';
import type { SourceFile } from './assembler.ts';

export interface ProjectSummary {
  readonly id: string;
  readonly name: string;
  /** ISO 8601 */
  readonly updatedAt: string;
}

/** Source files are the single source of truth; a project never stores a ROM. */
export interface Project {
  readonly id: string;
  readonly name: string;
  readonly settings: ProjectSettings;
  readonly files: readonly SourceFile[];
}

export interface ProjectStorePort {
  /** Most recently changed first. */
  list(): Promise<readonly ProjectSummary[]>;
  load(id: string): Promise<Project | undefined>;
  save(project: Project): Promise<void>;
  remove(id: string): Promise<void>;
  /** Save data of a build run: kept per project, not part of the source and not in the ZIP. */
  loadSaveData(id: string): Promise<Uint8Array | null>;
  saveSaveData(id: string, data: Uint8Array): Promise<void>;
}
