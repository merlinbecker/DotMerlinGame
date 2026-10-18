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

  it.each(['.tools/rgbds/rgbasm', '.build/sameboy/Core/gb.c', 'tests/roms/build/mbc1.gb'])('ignores %s', (path) => {
    expect(isIgnored(path)).toBe(true);
  });

  it.each([
    'src/adapters/emulator/sameboy/generated/sameboy.wasm',
    'src/adapters/emulator/sameboy/generated/BUILD-INFO.json',
    'src/adapters/emulator/bootrom/generated/dmg-boot.ts',
    'tests/roms/src/mbc.asm',
    'tests/roms/src/roms.json',
    'tests/roms/src/hardware.inc',
  ])('keeps committed artifact %s', (path) => {
    expect(isIgnored(path)).toBe(false);
  });

  it('keeps binary includes of example projects', () => {
    expect(isIgnored('examples/demo/data.bin')).toBe(false);
  });
});
