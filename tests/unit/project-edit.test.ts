import { describe, expect, it } from 'vitest';
import { createFile, defaultSettings, deleteFile, encodeSource, MBC_OPTIONS, projectNameValid, RAM_SIZE_OPTIONS, renameFile, settingsValid } from '../../src/core/index.ts';

const project = {
  id: 'p',
  name: 'p',
  settings: defaultSettings('p'),
  files: [{ path: 'main.asm', content: encodeSource('a') }, { path: 'b.inc', content: encodeSource('b') }],
};

describe('project edits', () => {
  it('creates an empty file', () => {
    const result = createFile(project, 'inc/c.inc');
    expect('project' in result && result.project.files.at(-1)).toEqual({ path: 'inc/c.inc', content: new Uint8Array() });
  });

  it('refuses unsafe and existing paths', () => {
    expect(createFile(project, '../c')).toEqual({ problem: 'invalid-path' });
    expect(createFile(project, 'b.inc')).toEqual({ problem: 'path-exists' });
    expect(renameFile(project, 'b.inc', 'main.asm')).toEqual({ problem: 'path-exists' });
    expect(renameFile(project, 'b.inc', '/x')).toEqual({ problem: 'invalid-path' });
    expect(renameFile(project, 'nope', 'x')).toEqual({ problem: 'no-such-file' });
  });

  it('keeps content and the entry setting when renaming', () => {
    const result = renameFile(project, 'main.asm', 'game.asm');
    if (!('project' in result)) throw new Error('refused');
    expect(result.project.settings.entry).toBe('game.asm');
    expect(result.project.files[0]).toEqual({ path: 'game.asm', content: encodeSource('a') });
  });

  it('never deletes the entry or the last file', () => {
    expect(deleteFile(project, 'main.asm')).toEqual({ problem: 'entry-file' });
    const result = deleteFile(project, 'b.inc');
    if (!('project' in result)) throw new Error('refused');
    expect(result.project.files).toHaveLength(1);
    expect(deleteFile(result.project, 'main.asm')).toEqual({ problem: 'last-file' });
  });

  it('checks settings', () => {
    expect(settingsValid(project, project.settings)).toBe(true);
    expect(settingsValid(project, { ...project.settings, entry: 'nope' })).toBe(false);
    expect(settingsValid(project, { ...project.settings, title: 'x'.repeat(17) })).toBe(false);
    expect(settingsValid(project, { ...project.settings, mbc: 'BOGUS' })).toBe(false);
    expect(settingsValid(project, { ...project.settings, ramSize: 1 })).toBe(false);
  });

  it('offers only cartridge types and RAM sizes that rgbfix accepts', () => {
    expect(MBC_OPTIONS).toContain('MBC5+RAM+BATTERY');
    expect(RAM_SIZE_OPTIONS.map((o) => o.code)).toEqual([0, 2, 3, 5, 4]);
  });

  it('checks project names', () => {
    expect(projectNameValid('a')).toBe(true);
    expect(projectNameValid(' ')).toBe(false);
    expect(projectNameValid('x'.repeat(65))).toBe(false);
  });
});
