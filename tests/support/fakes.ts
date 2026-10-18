import { vi } from 'vitest';
import { createDomainEventBus } from '../../src/core/events/domain-event-bus.ts';
import { createFrameStateHub } from '../../src/core/events/frame-state-hub.ts';
import { RomLoadError, type EmulatorPort, type RomRejectReason, type RomStorePort, type StoredRom } from '../../src/core/index.ts';

export function fakeEmulator(options: { reject?: RomRejectReason; battery?: Uint8Array } = {}) {
  const events = createDomainEventBus();
  let dirty = false;
  const emulator = {
    frameState: createFrameStateHub(),
    events,
    loadRom: vi.fn(() => (options.reject ? Promise.reject(new RomLoadError(options.reject)) : Promise.resolve())),
    run: vi.fn(),
    pause: vi.fn(),
    reset: vi.fn(),
    step: vi.fn(),
    setButton: vi.fn(),
    setBreakpoint: vi.fn(),
    clearBreakpoint: vi.fn(),
    readBatteryRam: vi.fn(() => {
      dirty = false;
      return options.battery ?? null;
    }),
    writeBatteryRam: vi.fn(),
    get batteryRamDirty() {
      return dirty;
    },
    setAudioSink: vi.fn(),
    markBatteryDirty: () => {
      dirty = true;
    },
  } satisfies EmulatorPort & Record<string, unknown>;
  return emulator;
}

export function memoryRomStore(initial: StoredRom | null = null) {
  let stored = initial;
  const store = {
    load: vi.fn(() => Promise.resolve(stored)),
    replace: vi.fn((rom: Omit<StoredRom, 'battery'>) => {
      stored = { ...rom, battery: null };
      return Promise.resolve();
    }),
    saveBattery: vi.fn((data: Uint8Array) => {
      if (stored) stored = { ...stored, battery: data };
      return Promise.resolve();
    }),
    current: () => stored,
  } satisfies RomStorePort & Record<string, unknown>;
  return store;
}

export function fakePage() {
  const listeners = new Map<string, Set<() => void>>();
  return {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener(type: string, listener: () => void) {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener(type: string, listener: () => void) {
      listeners.get(type)?.delete(listener);
    },
    fire(type: string) {
      for (const listener of listeners.get(type) ?? []) listener();
    },
  };
}
