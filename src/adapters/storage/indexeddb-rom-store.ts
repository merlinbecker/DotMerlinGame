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
        // The browser may close the connection while the page is in the background.
        req.result.onclose = () => {
          database = null;
        };
        resolve(req.result);
      };
      req.onerror = () => {
        database = null;
        reject(req.error ?? new Error('Cannot open IndexedDB'));
      };
    });
    return database;
  };

  /** A connection can be closing without a close event; then one new connection is opened. */
  const transaction = async (mode: IDBTransactionMode) => {
    const db = await open();
    try {
      return db.transaction(STORE, mode);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'InvalidStateError')) throw error;
      database = null;
      return (await open()).transaction(STORE, mode);
    }
  };

  const write = async (change: (store: IDBObjectStore) => void) => {
    try {
      const tx = await transaction('readwrite');
      change(tx.objectStore(STORE));
      await done(tx);
    } catch (error) {
      if (isQuotaError(error)) throw new StorageFullError();
      throw error;
    }
  };

  return {
    async load() {
      const tx = await transaction('readonly');
      const value: unknown = await request(tx.objectStore(STORE).get(KEY));
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
