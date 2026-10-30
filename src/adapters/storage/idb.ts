import { StorageFullError } from '../../core/index.ts';

export function request<T>(req: IDBRequest<T>): Promise<T> {
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

export interface ObjectStoreAccess {
  transaction(mode: IDBTransactionMode): Promise<IDBTransaction>;
  /** Runs one change in one transaction; a full disk surfaces as StorageFullError. */
  write(change: (store: IDBObjectStore) => void): Promise<void>;
  readonly storeName: string;
}

/** One object store in its own database; survives the browser closing the connection in the background. */
export function openObjectStore(databaseName: string, storeName: string): ObjectStoreAccess {
  let database: Promise<IDBDatabase> | null = null;
  const open = () => {
    database ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(databaseName, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(storeName);
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
      return db.transaction(storeName, mode);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'InvalidStateError')) throw error;
      database = null;
      return (await open()).transaction(storeName, mode);
    }
  };

  return {
    storeName,
    transaction,
    async write(change) {
      try {
        const tx = await transaction('readwrite');
        change(tx.objectStore(storeName));
        await done(tx);
      } catch (error) {
        if (isQuotaError(error)) throw new StorageFullError();
        throw error;
      }
    },
  };
}
