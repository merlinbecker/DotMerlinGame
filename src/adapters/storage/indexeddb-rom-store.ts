import { PROJECT_NAME } from '../../config/project.ts';
import type { RomStorePort, StoredRom } from '../../core/index.ts';
import { openObjectStore, request } from './idb.ts';

export const ROM_DB_NAME = `${PROJECT_NAME.toLowerCase()}-rom`;
const STORE = 'rom';
const KEY = 'current';

/** Holds the one ROM and its save game (FR-002, FR-026); data never leaves the device. */
export function createIndexedDbRomStore(databaseName = ROM_DB_NAME): RomStorePort {
  const access = openObjectStore(databaseName, STORE);

  return {
    async load() {
      const tx = await access.transaction('readonly');
      const value: unknown = await request(tx.objectStore(STORE).get(KEY));
      return (value as StoredRom | undefined) ?? null;
    },
    async replace(rom) {
      // One put of the whole record: the old save game is dropped in the same transaction.
      await access.write((store) => store.put({ ...rom, battery: null } satisfies StoredRom, KEY));
    },
    async saveBattery(data) {
      const current = await this.load();
      if (!current) return;
      await access.write((store) => store.put({ ...current, battery: data } satisfies StoredRom, KEY));
    },
  };
}
