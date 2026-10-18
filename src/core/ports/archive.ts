import type { Project } from './project-store.ts';

/** Project export and import as ZIP. */
export interface ArchivePort {
  exportProject(project: Project): Promise<Uint8Array>;
  importProject(zip: Uint8Array): Promise<Project>;
}
