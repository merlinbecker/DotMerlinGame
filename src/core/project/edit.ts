import type { Project } from '../ports/project-store.ts';
import { MAX_PROJECT_NAME_LENGTH, MAX_TITLE_LENGTH, type ProjectSettings } from './model.ts';
import { isSafePath } from './paths.ts';

export type FileProblem = 'invalid-path' | 'path-exists' | 'last-file' | 'entry-file' | 'no-such-file';
export type EditResult = { readonly project: Project } | { readonly problem: FileProblem };

/** Names as rgbfix accepts them (`rgbfix -m help`), limited to the types the emulator runs (ADR-0006). */
export const MBC_OPTIONS: readonly string[] = [
  'ROM_ONLY',
  'MBC1',
  'MBC1+RAM',
  'MBC1+RAM+BATTERY',
  'MBC3',
  'MBC3+RAM',
  'MBC3+RAM+BATTERY',
  'MBC5',
  'MBC5+RAM',
  'MBC5+RAM+BATTERY',
];

/** Pan Docs "The Cartridge Header" $0149: the code rgbfix -r writes, and the size it means. */
export const RAM_SIZE_OPTIONS: readonly { readonly code: number; readonly label: string }[] = [
  { code: 0, label: 'No RAM' },
  { code: 2, label: '8 KiB' },
  { code: 3, label: '32 KiB' },
  { code: 5, label: '64 KiB' },
  { code: 4, label: '128 KiB' },
];

const has = (project: Project, path: string) => project.files.some((file) => file.path === path);

export function createFile(project: Project, path: string): EditResult {
  if (!isSafePath(path)) return { problem: 'invalid-path' };
  if (has(project, path)) return { problem: 'path-exists' };
  return { project: { ...project, files: [...project.files, { path, content: new Uint8Array() }] } };
}

export function renameFile(project: Project, from: string, to: string): EditResult {
  if (!has(project, from)) return { problem: 'no-such-file' };
  if (!isSafePath(to)) return { problem: 'invalid-path' };
  if (from === to) return { project };
  if (has(project, to)) return { problem: 'path-exists' };
  return {
    project: {
      ...project,
      files: project.files.map((file) => (file.path === from ? { ...file, path: to } : file)),
      settings: project.settings.entry === from ? { ...project.settings, entry: to } : project.settings,
    },
  };
}

export function deleteFile(project: Project, path: string): EditResult {
  if (!has(project, path)) return { problem: 'no-such-file' };
  if (project.files.length === 1) return { problem: 'last-file' };
  if (project.settings.entry === path) return { problem: 'entry-file' };
  return { project: { ...project, files: project.files.filter((file) => file.path !== path) } };
}

export function settingsValid(project: Project, settings: ProjectSettings): boolean {
  return (
    has(project, settings.entry) &&
    settings.title.length <= MAX_TITLE_LENGTH &&
    MBC_OPTIONS.includes(settings.mbc) &&
    RAM_SIZE_OPTIONS.some((option) => option.code === settings.ramSize)
  );
}

export function projectNameValid(name: string): boolean {
  return name.trim() !== '' && name.length <= MAX_PROJECT_NAME_LENGTH;
}
