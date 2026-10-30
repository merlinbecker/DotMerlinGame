import type { Project } from './project-store.ts';

export type ArchiveRejectReason = 'not-a-zip' | 'no-project-file' | 'unknown-format' | 'invalid-project' | 'unsafe-path' | 'duplicate-path' | 'too-large' | 'too-many-files';

export class ArchiveRejectedError extends Error {
  readonly reason: ArchiveRejectReason;

  constructor(reason: ArchiveRejectReason) {
    super(`Archive rejected: ${reason}`);
    this.name = 'ArchiveRejectedError';
    this.reason = reason;
  }
}

/** Project export and import as ZIP; an import gives a complete project or rejects, it changes nothing itself. */
export interface ArchivePort {
  exportProject(project: Project): Promise<Uint8Array>;
  importProject(zip: Uint8Array): Promise<Project>;
}
