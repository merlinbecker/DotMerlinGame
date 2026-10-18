import { execSync } from 'node:child_process';

export type CommandRunner = (command: string) => string;

const runGit: CommandRunner = (command) =>
  execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

/** Short commit hash of the build, `-dirty` for uncommitted changes, `unknown` without git. */
export function resolveBuildVersion(run: CommandRunner = runGit): string {
  try {
    const hash = run('git rev-parse --short HEAD').trim();
    if (hash === '') return 'unknown';
    const dirty = run('git status --porcelain').trim() !== '';
    return dirty ? `${hash}-dirty` : hash;
  } catch {
    return 'unknown';
  }
}
