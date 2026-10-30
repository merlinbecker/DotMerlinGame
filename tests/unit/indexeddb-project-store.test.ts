// @vitest-environment node
import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { createIndexedDbProjectStore, PROJECT_DB_NAME } from '../../src/adapters/storage/indexeddb-project-store.ts';
import { PROJECT_NAME } from '../../src/config/project.ts';
import { defaultSettings, StorageFullError } from '../../src/core/index.ts';

const project = (id: string, name = id) => ({ id, name, settings: defaultSettings(name), files: [{ path: 'main.asm', content: new Uint8Array([0, 255, 128]) }] });
const store = () => createIndexedDbProjectStore(`test-${crypto.randomUUID()}`);

describe('IndexedDB project store', () => {
  it('derives the database name from the project name', () => {
    expect(PROJECT_DB_NAME).toContain(PROJECT_NAME.toLowerCase());
  });

  it('keeps binary content byte for byte and stores no extra fields in the project', async () => {
    const s = store();
    await s.save(project('a'));
    expect(await s.load('a')).toEqual(project('a'));
  });

  it('lists the most recently changed first', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const s = store();
    vi.setSystemTime(new Date('2026-10-30T10:00:00Z'));
    await s.save(project('old'));
    vi.setSystemTime(new Date('2026-10-30T11:00:00Z'));
    await s.save(project('new'));
    vi.useRealTimers();
    expect((await s.list()).map((p) => p.id)).toEqual(['new', 'old']);
  });

  it('removes a project', async () => {
    const s = store();
    await s.save(project('a'));
    await s.remove('a');
    expect(await s.load('a')).toBeUndefined();
    expect(await s.list()).toEqual([]);
  });

  it('turns a full disk into StorageFullError', async () => {
    const s = store();
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    await expect(s.save(project('a'))).rejects.toBeInstanceOf(StorageFullError);
    put.mockRestore();
  });
});
