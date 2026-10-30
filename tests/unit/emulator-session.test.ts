// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageFullError, type DomainEvent } from '../../src/core/index.ts';
import { BATTERY_SAVE_INTERVAL_MS, createEmulatorSession } from '../../src/app/session/emulator-session.ts';
import { DEFAULT_SETTINGS, loadSettings, SETTINGS_KEY } from '../../src/app/session/settings-store.ts';
import { fakeEmulator, fakePage, memoryRomStore } from '../support/fakes.ts';
import { testRom } from '../support/roms.ts';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  clear() {
    this.data.clear();
  }
}

function recordEvents(session: ReturnType<typeof createEmulatorSession>) {
  const events: DomainEvent[] = [];
  for (const type of ['RomLoaded', 'RomRejected', 'RunStateChanged', 'StorageFailed', 'EmulatorHalted', 'EmulatorReset'] as const) {
    session.events.subscribe(type, (event) => events.push(event));
  }
  return events;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('emulator session (US1)', () => {
  it('loads, stores and starts a ROM and publishes RomLoaded with a SHA-256 id', async () => {
    const emulator = fakeEmulator();
    const store = memoryRomStore();
    const session = createEmulatorSession({ emulator, romStore: store });
    const events = recordEvents(session);
    session.dispatch({ type: 'LoadRom', bytes: testRom('marker'), fileName: 'marker.gb' });
    await session.idle();
    expect(emulator.loadRom).toHaveBeenCalledWith(expect.any(Uint8Array), { bootMode: DEFAULT_SETTINGS.bootMode, hardwareChecks: false });
    expect(emulator.run).toHaveBeenCalled();
    expect(store.current()?.fileName).toBe('marker.gb');
    const loaded = events.find((e) => e.type === 'RomLoaded');
    expect(loaded).toMatchObject({ type: 'RomLoaded', title: 'MARKER' });
    expect(loaded && 'romId' in loaded ? loaded.romId : '').toMatch(/^[0-9a-f]{64}$/);
    expect(session.session.getSnapshot()).toMatchObject({ runState: 'running', fileName: 'marker.gb', storedRomAvailable: true, notice: null });
    expect(session.session.getSnapshot().rom?.title).toBe('MARKER');
  });

  it('keeps the previous state and shows a notice when a ROM is rejected', async () => {
    const emulator = fakeEmulator({ reject: 'cgb-only' });
    const store = memoryRomStore();
    const session = createEmulatorSession({ emulator, romStore: store });
    const events = recordEvents(session);
    session.dispatch({ type: 'LoadRom', bytes: testRom('cgb-only'), fileName: 'c.gb' });
    await session.idle();
    expect(events).toContainEqual({ type: 'RomRejected', reason: 'cgb-only' });
    expect(session.session.getSnapshot()).toMatchObject({ runState: 'empty', notice: { kind: 'rejected', reason: 'cgb-only' } });
    expect(store.replace).not.toHaveBeenCalled();
    expect(emulator.run).not.toHaveBeenCalled();
  });

  it('starts the stored ROM with its save game without a file picker (US1-AS4)', async () => {
    const battery = new Uint8Array([7]);
    const store = memoryRomStore({ bytes: testRom('mbc5-battery'), fileName: 'b.gb', loadedAt: '2026-10-18T00:00:00Z', battery });
    const emulator = fakeEmulator();
    const session = createEmulatorSession({ emulator, romStore: store });
    await session.init();
    expect(session.session.getSnapshot().storedRomAvailable).toBe(true);
    session.dispatch({ type: 'StartStoredRom' });
    await session.idle();
    expect(emulator.writeBatteryRam).toHaveBeenCalledWith(battery);
    expect(session.session.getSnapshot().runState).toBe('running');
  });

  it('still runs the ROM when the storage is full and shows a notice', async () => {
    const store = memoryRomStore();
    store.replace.mockRejectedValueOnce(new StorageFullError());
    const session = createEmulatorSession({ emulator: fakeEmulator(), romStore: store });
    const events = recordEvents(session);
    session.dispatch({ type: 'LoadRom', bytes: testRom('marker'), fileName: 'm.gb' });
    await session.idle();
    expect(events).toContainEqual({ type: 'StorageFailed', operation: 'save-rom' });
    expect(session.session.getSnapshot()).toMatchObject({ runState: 'running', notice: { kind: 'storage-full' } });
  });

  it('shows a notice for an invalid header when hardware checks are off', async () => {
    const session = createEmulatorSession({ emulator: fakeEmulator(), romStore: memoryRomStore() });
    session.dispatch({ type: 'LoadRom', bytes: testRom('bad-logo'), fileName: 'x.gb' });
    await session.idle();
    expect(session.session.getSnapshot()).toMatchObject({ runState: 'running', notice: { kind: 'header-invalid' } });
  });

  it('processes later actions after an action failed', async () => {
    const store = memoryRomStore();
    store.load.mockRejectedValueOnce(new Error('IndexedDB broken'));
    const emulator = fakeEmulator();
    const session = createEmulatorSession({ emulator, romStore: store });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    session.dispatch({ type: 'StartStoredRom' });
    session.dispatch({ type: 'LoadRom', bytes: testRom('marker'), fileName: 'm.gb' });
    await session.idle();
    expect(session.session.getSnapshot().runState).toBe('running');
  });

  it('forwards buttons to the emulator', async () => {
    const emulator = fakeEmulator();
    const session = createEmulatorSession({ emulator, romStore: memoryRomStore() });
    session.dispatch({ type: 'ButtonDown', button: 'A' });
    session.dispatch({ type: 'ButtonUp', button: 'A' });
    await session.idle();
    expect(emulator.setButton.mock.calls).toEqual([
      ['A', true],
      ['A', false],
    ]);
  });

  it('saves a changed save game at most every 2 s while running', async () => {
    vi.useFakeTimers();
    const emulator = fakeEmulator({ battery: new Uint8Array([1, 2]) });
    const store = memoryRomStore();
    const session = createEmulatorSession({ emulator, romStore: store });
    session.dispatch({ type: 'LoadRom', bytes: testRom('mbc5-battery'), fileName: 'b.gb' });
    await session.idle();
    emulator.markBatteryDirty();
    await vi.advanceTimersByTimeAsync(BATTERY_SAVE_INTERVAL_MS - 1);
    expect(store.saveBattery).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(store.saveBattery).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(BATTERY_SAVE_INTERVAL_MS * 3);
    expect(store.saveBattery).toHaveBeenCalledTimes(1);
  });

  it('pauses and saves when the page is hidden, resumes only what it paused', async () => {
    const emulator = fakeEmulator({ battery: new Uint8Array([3]) });
    const store = memoryRomStore();
    const page = fakePage();
    const session = createEmulatorSession({ emulator, romStore: store, page });
    session.dispatch({ type: 'LoadRom', bytes: testRom('mbc5-battery'), fileName: 'b.gb' });
    await session.idle();
    emulator.markBatteryDirty();
    page.visibilityState = 'hidden';
    page.fire('visibilitychange');
    await vi.waitFor(() => {
      expect(store.saveBattery).toHaveBeenCalled();
    });
    expect(session.session.getSnapshot().runState).toBe('paused');
    page.visibilityState = 'visible';
    page.fire('visibilitychange');
    expect(session.session.getSnapshot().runState).toBe('running');

    session.dispatch({ type: 'Pause' });
    await session.idle();
    page.visibilityState = 'hidden';
    page.fire('visibilitychange');
    page.visibilityState = 'visible';
    page.fire('visibilitychange');
    expect(session.session.getSnapshot().runState).toBe('paused');
  });

  it('saves the save game on pagehide', async () => {
    const emulator = fakeEmulator({ battery: new Uint8Array([5]) });
    const store = memoryRomStore();
    const page = fakePage();
    const session = createEmulatorSession({ emulator, romStore: store, page });
    session.dispatch({ type: 'LoadRom', bytes: testRom('mbc5-battery'), fileName: 'b.gb' });
    await session.idle();
    emulator.markBatteryDirty();
    page.fire('pagehide');
    await vi.waitFor(() => {
      expect(store.current()?.battery).toEqual(new Uint8Array([5]));
    });
  });

  it.each([false, true])('publishes EmulatorReset after a reset (paused before: %s, M1b)', async (paused) => {
    const emulator = fakeEmulator();
    const session = createEmulatorSession({ emulator, romStore: memoryRomStore() });
    session.dispatch({ type: 'LoadRom', bytes: testRom('marker'), fileName: 'marker.gb' });
    await session.idle();
    if (paused) session.dispatch({ type: 'Pause' });
    await session.idle();
    const events = recordEvents(session);
    session.dispatch({ type: 'Reset' });
    await session.idle();
    expect(emulator.reset).toHaveBeenCalled();
    expect(events.filter((e) => e.type === 'EmulatorReset')).toHaveLength(1);
  });

  it('ignores RequestSnapshot, which the slot handles (M1b)', async () => {
    const emulator = fakeEmulator();
    const session = createEmulatorSession({ emulator, romStore: memoryRomStore() });
    session.dispatch({ type: 'RequestSnapshot' });
    await session.idle();
    expect(session.session.getSnapshot().runState).toBe('empty');
  });

  it('runs a built ROM without storing it and keeps the save game of the stored ROM (M2 R8)', async () => {
    vi.useFakeTimers();
    const stored = { bytes: testRom('marker'), fileName: 'marker.gb', loadedAt: '', battery: new Uint8Array([7]) };
    const romStore = memoryRomStore(stored);
    const emulator = fakeEmulator({ battery: new Uint8Array([9]) });
    const session = createEmulatorSession({ emulator, romStore });
    await session.runBuiltRom(testRom('marker'), 'built.gb');
    expect(session.session.getSnapshot()).toMatchObject({ runState: 'running', fileName: 'built.gb' });
    expect(romStore.replace).not.toHaveBeenCalled();

    emulator.markBatteryDirty();
    await vi.advanceTimersByTimeAsync(BATTERY_SAVE_INTERVAL_MS);
    expect(romStore.saveBattery).not.toHaveBeenCalled();

    session.dispatch({ type: 'StartStoredRom' });
    await session.idle();
    expect(emulator.writeBatteryRam).toHaveBeenCalledWith(new Uint8Array([7]));
    session.dispose();
    vi.useRealTimers();
  });

  it('turns a hardware-near halt into run state halted with a notice (US2)', async () => {
    const emulator = fakeEmulator();
    const session = createEmulatorSession({ emulator, romStore: memoryRomStore() });
    const events = recordEvents(session);
    session.dispatch({ type: 'SetHardwareChecks', enabled: true });
    session.dispatch({ type: 'LoadRom', bytes: testRom('bad-logo'), fileName: 'x.gb' });
    await session.idle();
    emulator.events.publish({ type: 'EmulatorHalted', reason: 'header-logo' });
    expect(session.session.getSnapshot()).toMatchObject({ runState: 'halted', notice: { kind: 'halted', reason: 'header-logo' } });
    expect(events).toContainEqual({ type: 'EmulatorHalted', reason: 'header-logo' });
  });

  it('applies boot mode and hardware checks on the next start', async () => {
    const emulator = fakeEmulator();
    const session = createEmulatorSession({ emulator, romStore: memoryRomStore() });
    session.dispatch({ type: 'SetBootMode', bootMode: 'own-boot-rom' });
    session.dispatch({ type: 'SetHardwareChecks', enabled: true });
    session.dispatch({ type: 'LoadRom', bytes: testRom('marker'), fileName: 'm.gb' });
    await session.idle();
    expect(emulator.loadRom).toHaveBeenLastCalledWith(expect.any(Uint8Array), { bootMode: 'own-boot-rom', hardwareChecks: true });
  });

  it('persists settings with defaults from data-model.md', async () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.hardwareChecks).toBe(false);
    const session = createEmulatorSession({ emulator: fakeEmulator(), romStore: memoryRomStore() });
    session.dispatch({ type: 'SetHardwareChecks', enabled: true });
    session.dispatch({ type: 'SetBootMode', bootMode: 'own-boot-rom' });
    await session.idle();
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')).toMatchObject({ hardwareChecks: true, bootMode: 'own-boot-rom' });
    expect(session.session.getSnapshot().settings).toEqual({ bootMode: 'own-boot-rom', hardwareChecks: true });
  });
});
