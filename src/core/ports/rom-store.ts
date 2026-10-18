export interface StoredRom {
  readonly bytes: Uint8Array;
  readonly fileName: string;
  /** ISO 8601 */
  readonly loadedAt: string;
  /** Battery-backed cartridge RAM (save game), if any. */
  readonly battery: Uint8Array | null;
}

/** Thrown when the browser storage is full (QuotaExceededError). */
export class StorageFullError extends Error {
  constructor() {
    super('Browser storage is full');
    this.name = 'StorageFullError';
  }
}

/**
 * Holds at most one ROM with its save game (FR-002, FR-026). Separate from ProjectStorePort, which never
 * stores ROMs (ADR-0005, M1 amendment).
 */
export interface RomStorePort {
  load(): Promise<StoredRom | null>;
  /** Replaces the ROM and drops the old save game in one transaction. */
  replace(rom: Omit<StoredRom, 'battery'>): Promise<void>;
  saveBattery(data: Uint8Array): Promise<void>;
}
