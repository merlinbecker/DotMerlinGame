import type { BuildResult, ProjectSettings, SourceFile } from '../../../core/index.ts';

export interface WorkerRequest {
  readonly files: readonly SourceFile[];
  readonly settings: ProjectSettings;
}

export type WorkerReply =
  | { readonly type: 'ready' }
  | { readonly type: 'result'; readonly result: Omit<BuildResult, 'durationMs'> }
  | { readonly type: 'failed'; readonly message: string };
