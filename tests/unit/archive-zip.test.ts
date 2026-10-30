// @vitest-environment node
import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { createFflateArchive, MAX_ENTRIES, MAX_UNPACKED_BYTES } from '../../src/adapters/archive/fflate-archive.ts';
import { ArchiveRejectedError, defaultSettings, encodeSource, type ArchiveRejectReason, type Project } from '../../src/core/index.ts';

const archive = createFflateArchive(() => 'new-id');
const META = { formatVersion: 1, name: 'game', settings: defaultSettings('game') };
const metaFile = (meta: unknown = META) => encodeSource(JSON.stringify(meta));
const project: Project = {
  id: 'old',
  name: 'game',
  settings: defaultSettings('game'),
  files: [
    { path: 'main.asm', content: encodeSource('nop\n') },
    { path: 'inc/a.inc', content: encodeSource('ÄÖ\n') },
    { path: 'data/b.bin', content: new Uint8Array([0, 255, 1, 128]) },
  ],
};

async function rejected(zip: Uint8Array, reason: ArchiveRejectReason) {
  const error: unknown = await archive.importProject(zip).then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ArchiveRejectedError);
  expect((error as ArchiveRejectedError).reason).toBe(reason);
}

/** Patches the declared size of all entries, the attack of research.md R7. */
function forgeSizes(zip: Uint8Array, size: number): Uint8Array {
  const out = zip.slice();
  const view = new DataView(out.buffer);
  for (let i = 0; i < out.length - 4; i++) {
    const signature = view.getUint32(i, true);
    if (signature === 0x04034b50) view.setUint32(i + 22, size, true);
    if (signature === 0x02014b50) view.setUint32(i + 24, size, true);
  }
  return out;
}

describe('ZIP archive', () => {
  it('round trips all files byte for byte, with a new id', async () => {
    const back = await archive.importProject(await archive.exportProject(project));
    expect(back.id).toBe('new-id');
    expect(back.name).toBe(project.name);
    expect(back.settings).toEqual(project.settings);
    const sorted = (p: Project) => [...p.files].sort((a, b) => a.path.localeCompare(b.path));
    expect(sorted(back).map((f) => [f.path, [...f.content]])).toEqual(sorted(project).map((f) => [f.path, [...f.content]]));
  });

  it('gives the same archive for the same project', async () => {
    expect(await archive.exportProject(project)).toEqual(await archive.exportProject(project));
  });

  it('reads an archive from before M3 as fixing the header, and keeps an explicit false', async () => {
    const older = Object.fromEntries(Object.entries(defaultSettings('game')).filter(([key]) => key !== 'fixHeader'));
    const before = await archive.importProject(zipSync({ 'project.json': metaFile({ ...META, settings: older }), 'main.asm': encodeSource('') }));
    expect(before.settings.fixHeader).toBe(true);
    const kept = await archive.importProject(await archive.exportProject({ ...project, settings: { ...project.settings, fixHeader: false } }));
    expect(kept.settings.fixHeader).toBe(false);
  });

  it('rejects what is no ZIP', () => rejected(encodeSource('not a zip at all'), 'not-a-zip'));

  it('rejects an archive without project.json', () => rejected(zipSync({ 'main.asm': encodeSource('nop') }), 'no-project-file'));

  it('rejects an unknown format', () => rejected(zipSync({ 'project.json': metaFile({ ...META, formatVersion: 2 }), 'main.asm': encodeSource('') }), 'unknown-format'));

  it('rejects broken metadata', () => rejected(zipSync({ 'project.json': encodeSource('{'), 'main.asm': encodeSource('') }), 'invalid-project'));

  it('rejects a project whose entry file is missing', () => rejected(zipSync({ 'project.json': metaFile(), 'other.asm': encodeSource('') }), 'invalid-project'));

  it.each(['../evil.asm', '/evil.asm', 'a/../../evil.asm', 'a\\evil.asm', 'C:/evil.asm'])('rejects the path %s', (path) =>
    rejected(zipSync({ 'project.json': metaFile(), 'main.asm': encodeSource(''), [path]: encodeSource('x') }), 'unsafe-path'),
  );

  it('rejects too many files', () => {
    const contents: Record<string, Uint8Array> = { 'project.json': metaFile(), 'main.asm': encodeSource('') };
    for (let i = 0; i <= MAX_ENTRIES; i++) contents[`f${String(i)}`] = new Uint8Array(0);
    return rejected(zipSync(contents), 'too-many-files');
  });

  it('rejects too much unpacked data', () =>
    rejected(zipSync({ 'project.json': metaFile(), 'main.asm': encodeSource(''), big: new Uint8Array(MAX_UNPACKED_BYTES + 1) }), 'too-large'));

  it('counts real bytes when the declared size is forged', () =>
    rejected(forgeSizes(zipSync({ 'project.json': metaFile(), 'main.asm': encodeSource(''), big: new Uint8Array(MAX_UNPACKED_BYTES + 1) }, { level: 9 }), 10), 'too-large'));
});
