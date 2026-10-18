// @vitest-environment node
import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { StorageFullError } from '../../src/core/index.ts';
import { createIndexedDbRomStore, ROM_DB_NAME } from '../../src/adapters/storage/indexeddb-rom-store.ts';
import { PROJECT_NAME } from '../../src/config/project.ts';

const rom = (fill: number) => ({ bytes: new Uint8Array([fill, fill]), fileName: `rom${fill}.gb`, loadedAt: '2026-10-18T12:00:00.000Z' });

describe('IndexedDB ROM store', () => {
  it('derives the database name from the project name', () => {
    expect(ROM_DB_NAME).toContain(PROJECT_NAME.toLowerCase());
  });

  it('is empty at first', async () => {
    const store = createIndexedDbRomStore(`test-${crypto.randomUUID()}`);
    expect(await store.load()).toBeNull();
  });

  it('holds exactly one ROM and replaces it together with the save game', async () => {
    const store = createIndexedDbRomStore(`test-${crypto.randomUUID()}`);
    await store.replace(rom(1));
    await store.saveBattery(new Uint8Array([9, 9, 9]));
    expect(await store.load()).toEqual({ ...rom(1), battery: new Uint8Array([9, 9, 9]) });
    await store.replace(rom(2));
    expect(await store.load()).toEqual({ ...rom(2), battery: null });
  });

  it('ignores a save game while no ROM is stored', async () => {
    const store = createIndexedDbRomStore(`test-${crypto.randomUUID()}`);
    await store.saveBattery(new Uint8Array([1]));
    expect(await store.load()).toBeNull();
  });

  it('reports a full storage as StorageFullError', async () => {
    const store = createIndexedDbRomStore(`test-${crypto.randomUUID()}`);
    const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    await expect(store.replace(rom(1))).rejects.toBeInstanceOf(StorageFullError);
    spy.mockRestore();
  });
});
