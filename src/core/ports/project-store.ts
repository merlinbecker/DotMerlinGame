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
  readonly files: readonly SourceFile[];
}

export interface ProjectStorePort {
  list(): Promise<readonly ProjectSummary[]>;
  load(id: string): Promise<Project | undefined>;
  save(project: Project): Promise<void>;
  remove(id: string): Promise<void>;
}
