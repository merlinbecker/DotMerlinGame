import { describe, expect, it } from 'vitest';
import { decodeSource, defaultSettings, encodeSource, MAX_PROJECT_NAME_LENGTH, MAX_TITLE_LENGTH, projectProblem } from '../../src/core/index.ts';

const file = (path: string) => ({ path, content: encodeSource('x') });
const valid = { name: 'game', settings: defaultSettings('game'), files: [file('main.asm')] };

describe('project model', () => {
  it('starts with the documented settings', () => {
    expect(defaultSettings('game')).toEqual({ entry: 'main.asm', title: 'GAME', mbc: 'ROM_ONLY', ramSize: 0, fixHeader: true });
    expect(defaultSettings('x'.repeat(40)).title).toHaveLength(MAX_TITLE_LENGTH);
  });

  it('accepts a valid project', () => {
    expect(projectProblem(valid)).toBeNull();
  });

  it.each([
    ['empty-name', { ...valid, name: ' ' }],
    ['name-too-long', { ...valid, name: 'x'.repeat(MAX_PROJECT_NAME_LENGTH + 1) }],
    ['no-files', { ...valid, files: [] }],
    ['duplicate-path', { ...valid, files: [file('main.asm'), file('main.asm')] }],
    ['unsafe-path', { ...valid, files: [file('../main.asm')] }],
    ['entry-missing', { ...valid, files: [file('other.asm')] }],
  ])('reports %s', (problem, project) => {
    expect(projectProblem(project)).toBe(problem);
  });

  it('allows a name at the limit', () => {
    expect(projectProblem({ ...valid, name: 'x'.repeat(MAX_PROJECT_NAME_LENGTH) })).toBeNull();
  });

  it('opens valid UTF-8 only', () => {
    expect(decodeSource(file('a'))).toBe('x');
    expect(decodeSource({ path: 'b', content: new Uint8Array([0xff, 0xfe]) })).toBeNull();
  });
});
