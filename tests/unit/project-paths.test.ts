import { describe, expect, it } from 'vitest';
import { isSafePath } from '../../src/core/index.ts';

describe('project paths', () => {
  it.each(['main.asm', 'include/a.inc', 'a/b/c.bin', 'with space.asm'])('accepts %s', (path) => {
    expect(isSafePath(path)).toBe(true);
  });

  it.each(['', '/etc/passwd', '../x', 'a/../b', 'a/./b', 'a//b', 'a/', 'a\\b', 'C:/x', 'c:x', 'a\0b'])('rejects %j', (path) => {
    expect(isSafePath(path)).toBe(false);
  });
});
