import { PROJECT_NAME } from '../../config/project.ts';
import { StorageFullError, type RomStorePort, type StoredRom } from '../../core/index.ts';

export const ROM_DB_NAME = `${PROJECT_NAME.toLowerCase()}-rom`;
const STORE = 'rom';
const KEY = 'current';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(req.error ?? new Error('IndexedDB request failed'));
    };
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      reject(tx.error ?? new Error('IndexedDB transaction failed'));
    };
    tx.onabort = () => {
      reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    };
  });
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError';
}

/** Holds the one ROM and its save game (FR-002, FR-026); data never leaves the device. */
export function createIndexedDbRomStore(databaseName = ROM_DB_NAME): RomStorePort {
  let database: Promise<IDBDatabase> | null = null;
  const open = () => {
    database ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(databaseName, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => {
        resolve(req.result);
      };
      req.onerror = () => {
        reject(req.error ?? new Error('Cannot open IndexedDB'));
      };
    });
    return database;
  };

  const write = async (change: (store: IDBObjectStore) => void) => {
    const db = await open();
    try {
      const tx = db.transaction(STORE, 'readwrite');
      change(tx.objectStore(STORE));
      await done(tx);
    } catch (error) {
      if (isQuotaError(error)) throw new StorageFullError();
      throw error;
    }
  };

  return {
    async load() {
      const db = await open();
      const value: unknown = await request(db.transaction(STORE).objectStore(STORE).get(KEY));
      return (value as StoredRom | undefined) ?? null;
    },
    async replace(rom) {
      // One put of the whole record: the old save game is dropped in the same transaction.
      await write((store) => store.put({ ...rom, battery: null } satisfies StoredRom, KEY));
    },
    async saveBattery(data) {
      const current = await this.load();
      if (!current) return;
      await write((store) => store.put({ ...current, battery: data } satisfies StoredRom, KEY));
    },
  };
}
