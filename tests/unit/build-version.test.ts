import { describe, expect, it } from 'vitest';
import { resolveBuildVersion } from '../../build/build-version.ts';

function runner(outputs: Record<string, string>) {
  return (command: string): string => {
    const output = outputs[command];
    if (output === undefined) throw new Error(`unexpected command: ${command}`);
    return output;
  };
}

describe('resolveBuildVersion', () => {
  it('returns the short hash for a clean working tree', () => {
    const run = runner({ 'git rev-parse --short HEAD': 'abc1234\n', 'git status --porcelain': '' });
    expect(resolveBuildVersion(run)).toBe('abc1234');
  });

  it('appends -dirty when the working tree has changes', () => {
    const run = runner({ 'git rev-parse --short HEAD': 'abc1234\n', 'git status --porcelain': ' M src/a.ts\n' });
    expect(resolveBuildVersion(run)).toBe('abc1234-dirty');
  });

  it('falls back to unknown when git is not available', () => {
    const run = () => {
      throw new Error('git: command not found');
    };
    expect(resolveBuildVersion(run)).toBe('unknown');
  });

  it('falls back to unknown when git prints nothing', () => {
    const run = runner({ 'git rev-parse --short HEAD': '  \n', 'git status --porcelain': '' });
    expect(resolveBuildVersion(run)).toBe('unknown');
  });
});
