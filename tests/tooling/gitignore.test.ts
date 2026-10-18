// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function isIgnored(path: string): boolean {
  try {
    execFileSync('git', ['check-ignore', '--quiet', '--no-index', path], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

describe('.gitignore', () => {
  it.each(['roms/x.gb', 'game.gb', 'game.gbc', 'game.sgb', 'dmg_boot.bin', 'dmg0_boot.bin'])('ignores %s', (path) => {
    expect(isIgnored(path)).toBe(true);
  });

  it('keeps binary includes of example projects', () => {
    expect(isIgnored('examples/demo/data.bin')).toBe(false);
  });
});
