import { Unzip, UnzipInflate, UnzipPassThrough, zipSync, type Zippable } from 'fflate';
import { ArchiveRejectedError, encodeSource, isSafePath, projectProblem, type ArchivePort, type ArchiveRejectReason, type Project, type ProjectSettings, type SourceFile } from '../../core/index.ts';

// Start values (M2 research.md R7). The sizes declared in an archive are not trusted: bytes are counted while they unpack.
export const MAX_ARCHIVE_BYTES = 16 * 1024 * 1024;
export const MAX_UNPACKED_BYTES = 16 * 1024 * 1024;
export const MAX_ENTRIES = 1000;
const PROJECT_FILE = 'project.json';
const FORMAT_VERSION = 1;
/** Fixed, so the same project gives the same archive. */
const FIXED_TIME = new Date('1980-01-01T00:00:00Z');

function reject(reason: ArchiveRejectReason): never {
  throw new ArchiveRejectedError(reason);
}

function unpack(zip: Uint8Array): Map<string, Uint8Array> {
  if (zip.length > MAX_ARCHIVE_BYTES) reject('too-large');
  const entries = new Map<string, Uint8Array>();
  const incomplete = new Set<string>();
  let total = 0;
  let count = 0;
  const unzip = new Unzip((file) => {
    if (++count > MAX_ENTRIES) reject('too-many-files');
    if (file.name.endsWith('/')) return; // a directory entry
    if (!isSafePath(file.name)) reject('unsafe-path');
    if (entries.has(file.name) || incomplete.has(file.name)) reject('duplicate-path');
    const chunks: Uint8Array[] = [];
    incomplete.add(file.name);
    file.ondata = (error, data, final) => {
      // fflate hands an exception thrown here back to this callback.
      if (error instanceof ArchiveRejectedError) throw error;
      if (error) reject('not-a-zip');
      total += data.length;
      if (total > MAX_UNPACKED_BYTES) reject('too-large');
      chunks.push(data);
      if (!final) return;
      const content = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        content.set(chunk, offset);
        offset += chunk.length;
      }
      entries.set(file.name, content);
      incomplete.delete(file.name);
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  unzip.register(UnzipPassThrough);
  try {
    unzip.push(zip, true);
  } catch (error) {
    if (error instanceof ArchiveRejectedError) throw error;
    reject('not-a-zip');
  }
  if (entries.size === 0 || incomplete.size > 0) reject('not-a-zip');
  return entries;
}

function parseMeta(bytes: Uint8Array): { name: string; settings: ProjectSettings } {
  let meta: unknown;
  try {
    meta = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    reject('invalid-project');
  }
  const { formatVersion, name, settings } = (meta ?? {}) as { formatVersion?: unknown; name?: unknown; settings?: Partial<ProjectSettings> | null };
  if (formatVersion !== FORMAT_VERSION) reject('unknown-format');
  if (typeof name !== 'string' || !settings) reject('invalid-project');
  const { entry, title, mbc, ramSize } = settings;
  if (typeof entry !== 'string' || typeof title !== 'string' || typeof mbc !== 'string' || typeof ramSize !== 'number') reject('invalid-project');
  return { name, settings: { entry, title, mbc, ramSize } };
}

export function createFflateArchive(createId: () => string = () => crypto.randomUUID()): ArchivePort {
  return {
    exportProject(project) {
      const meta = JSON.stringify({ formatVersion: FORMAT_VERSION, name: project.name, settings: project.settings }, null, 2);
      const contents: Zippable = { [PROJECT_FILE]: [encodeSource(meta), { mtime: FIXED_TIME }] };
      for (const file of project.files) contents[file.path] = [file.content, { mtime: FIXED_TIME }];
      return Promise.resolve(zipSync(contents));
    },
    importProject(zip) {
      try {
        const entries = unpack(zip);
        const metaBytes = entries.get(PROJECT_FILE);
        if (!metaBytes) reject('no-project-file');
        const { name, settings } = parseMeta(metaBytes);
        entries.delete(PROJECT_FILE);
        const files: SourceFile[] = [...entries].map(([path, content]) => ({ path, content }));
        const project: Project = { id: createId(), name, settings, files };
        if (projectProblem(project)) reject('invalid-project');
        return Promise.resolve(project);
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
}
