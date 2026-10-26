import { createDomainEventBus } from '../../core/events/domain-event-bus.ts';
import {
  parseHeader,
  RomLoadError,
  StorageFullError,
  type AudioOutputPort,
  type Diagnostics,
  type DomainEvent,
  type EmulatorPort,
  type Notice,
  type ProjectStateSource,
  type RomStorePort,
  type RunState,
  type SessionState,
  type ViewAction,
} from '../../core/index.ts';
import type { AppServices } from '../services.ts';
import { loadSettings, saveSettings, type Settings } from './settings-store.ts';

/** Save game is written at most this often while it changes (research.md R10). */
export const BATTERY_SAVE_INTERVAL_MS = 2000;

type PageEvent = 'visibilitychange' | 'pagehide' | (typeof UNLOCK_EVENTS)[number];

interface Page {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: PageEvent, listener: () => void): void;
  removeEventListener(type: PageEvent, listener: () => void): void;
}

/**
 * Events that count as user activation in Chrome. pointerdown does not on touch screens, only for the
 * mouse; so sound is unlocked on the release of a tap (HTML "activation triggering input event").
 */
const UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const;

export interface SessionDeps {
  readonly emulator: EmulatorPort;
  readonly romStore: RomStorePort;
  readonly audio?: AudioOutputPort | null;
  readonly page?: Page | null;
  /** Measured values for SC-003/SC-007, refreshed once per second while running. */
  readonly diagnostics?: () => Diagnostics;
}

export const DIAGNOSTICS_INTERVAL_MS = 1000;

export interface EmulatorSession extends AppServices {
  /** Reported by the gamepad adapter (FR-006). */
  setGamepads(names: readonly string[]): void;
  /** Checks for a stored ROM; does not start it (US1-AS4: start without file picker on request). */
  init(): Promise<void>;
  /** Resolves when all dispatched actions are processed (tests). */
  idle(): Promise<void>;
  dispose(): void;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Orchestrates emulator, ROM store, settings and audio; the only receiver of view actions besides the
 * slot itself (Constitution II). Framework-free.
 */
export function createEmulatorSession(deps: SessionDeps): EmulatorSession {
  const { emulator, romStore } = deps;
  const audio = deps.audio ?? null;
  const page = deps.page ?? null;
  const bus = createDomainEventBus();
  const listeners = new Set<() => void>();
  let settings: Settings = loadSettings();
  let state: SessionState = {
    runState: 'empty',
    rom: null,
    fileName: null,
    storedRomAvailable: false,
    settings: { bootMode: settings.bootMode, hardwareChecks: settings.hardwareChecks },
    audio: { muted: settings.muted, volume: settings.volume, unlocked: audio?.unlocked ?? false },
    notice: null,
    diagnostics: { frameTimeP95Ms: null, frameWorkP95Ms: null, emulatedFps: null, audioUnderflows: 0, audioOverflows: 0 },
    gamepads: [],
  };
  let queue: Promise<void> = Promise.resolve();
  let pausedByPage = false;
  let batteryTimer: ReturnType<typeof setInterval> | null = null;
  let diagnosticsTimer: ReturnType<typeof setInterval> | null = null;

  const update = (patch: Partial<SessionState>) => {
    state = { ...state, ...patch };
    for (const listener of [...listeners]) listener();
  };

  const publish = (event: DomainEvent) => {
    bus.publish(event);
  };

  const setRunState = (runState: RunState) => {
    if (state.runState === runState) return;
    update({ runState });
    publish({ type: 'RunStateChanged', runState });
  };

  const notify = (notice: Notice | null) => {
    update({ notice });
  };

  const saveBattery = async () => {
    if (!emulator.batteryRamDirty) return;
    const data = emulator.readBatteryRam();
    if (!data) return;
    try {
      await romStore.saveBattery(data);
    } catch (error) {
      if (!(error instanceof StorageFullError)) throw error;
      publish({ type: 'StorageFailed', operation: 'save-battery' });
      notify({ kind: 'storage-full' });
    }
  };

  const startBatteryTimer = () => {
    batteryTimer ??= setInterval(() => {
      void saveBattery();
    }, BATTERY_SAVE_INTERVAL_MS);
    const measure = deps.diagnostics;
    if (measure) {
      diagnosticsTimer ??= setInterval(() => {
        update({ diagnostics: measure() });
      }, DIAGNOSTICS_INTERVAL_MS);
    }
  };

  const stopBatteryTimer = () => {
    if (batteryTimer !== null) clearInterval(batteryTimer);
    if (diagnosticsTimer !== null) clearInterval(diagnosticsTimer);
    batteryTimer = null;
    diagnosticsTimer = null;
  };

  const run = () => {
    emulator.run();
    setRunState('running');
    startBatteryTimer();
    void audio?.resume();
  };

  const pause = async () => {
    emulator.pause();
    if (state.runState === 'running') setRunState('paused');
    stopBatteryTimer();
    await saveBattery();
    await audio?.suspend();
  };

  /** Loads into the emulator; on rejection nothing changes (edge case: emulator keeps its state). */
  const start = async (bytes: Uint8Array, fileName: string, battery: Uint8Array | null): Promise<boolean> => {
    try {
      await emulator.loadRom(bytes, { bootMode: settings.bootMode, hardwareChecks: settings.hardwareChecks });
    } catch (error) {
      if (!(error instanceof RomLoadError)) throw error;
      publish({ type: 'RomRejected', reason: error.reason });
      notify({ kind: 'rejected', reason: error.reason });
      return false;
    }
    if (battery) emulator.writeBatteryRam(battery);
    const rom = await parseHeader(bytes);
    const headerInvalid = !(rom.logoValid && rom.headerChecksumValid);
    update({ rom, fileName, notice: headerInvalid && !settings.hardwareChecks ? { kind: 'header-invalid' } : null });
    publish({ type: 'RomLoaded', romId: await sha256Hex(bytes), title: rom.title || fileName });
    if (state.runState !== 'halted') run();
    return true;
  };

  const loadRom = async (bytes: Uint8Array, fileName: string) => {
    await saveBattery();
    if (!(await start(bytes, fileName, null))) return;
    try {
      await romStore.replace({ bytes, fileName, loadedAt: new Date().toISOString() });
      update({ storedRomAvailable: true });
    } catch (error) {
      if (!(error instanceof StorageFullError)) throw error;
      publish({ type: 'StorageFailed', operation: 'save-rom' });
      notify({ kind: 'storage-full' });
    }
  };

  const startStored = async () => {
    const stored = await romStore.load();
    if (!stored) {
      update({ storedRomAvailable: false });
      return;
    }
    await start(stored.bytes, stored.fileName, stored.battery);
  };

  const changeSettings = (patch: Partial<Settings>) => {
    settings = { ...settings, ...patch };
    saveSettings(settings);
    update({
      settings: { bootMode: settings.bootMode, hardwareChecks: settings.hardwareChecks },
      audio: { ...state.audio, muted: settings.muted, volume: settings.volume },
    });
  };

  const isUnlocked = () => audio?.unlocked === true;

  /** Must start inside the user's event: audio.unlock() is called before the first await. */
  const unlockAudio = async () => {
    if (!audio || audio.unlocked) return;
    try {
      await audio.unlock();
    } catch {
      return; // not allowed yet; the next tap tries again
    }
    if (!isUnlocked()) return; // re-read: the browser may still refuse
    update({ audio: { ...state.audio, unlocked: true }, notice: state.notice?.kind === 'audio-locked' ? null : state.notice });
    for (const type of UNLOCK_EVENTS) page?.removeEventListener(type, onUserActivation);
  };

  const handle = async (action: ViewAction): Promise<void> => {
    switch (action.type) {
      case 'LoadRom':
        return loadRom(action.bytes, action.fileName);
      case 'StartStoredRom':
        return startStored();
      case 'ButtonDown':
      case 'ButtonUp':
        emulator.setButton(action.button, action.type === 'ButtonDown');
        return;
      case 'Pause':
        return pause();
      case 'Resume':
        if (state.runState === 'paused') run();
        return;
      case 'Reset':
        if (state.runState === 'empty') return;
        emulator.reset();
        if (state.runState !== 'running') run();
        publish({ type: 'EmulatorReset' });
        return;
      case 'SetBootMode':
        changeSettings({ bootMode: action.bootMode });
        return;
      case 'SetHardwareChecks':
        changeSettings({ hardwareChecks: action.enabled });
        return;
      case 'SetVolume':
        changeSettings({ volume: action.volume });
        audio?.setVolume(settings.volume);
        return;
      case 'SetMuted':
        changeSettings({ muted: action.muted });
        audio?.setMuted(action.muted);
        return;
      case 'UnlockAudio':
        return; // handled synchronously in dispatch, inside the user's event
      case 'SetFrameRate':
      case 'RequestSnapshot':
      case 'SetBreakpoint':
      case 'ClearBreakpoint':
        return; // per slot (SetFrameRate, RequestSnapshot) or M4 (breakpoints)
    }
  };

  const onVisibility = () => {
    if (page?.visibilityState === 'hidden') {
      if (state.runState === 'running') {
        pausedByPage = true;
        void pause();
      }
    } else if (pausedByPage) {
      pausedByPage = false;
      if (state.runState === 'paused') run();
    }
  };
  const onPageHide = () => {
    void saveBattery();
  };
  const onUserActivation = () => {
    void unlockAudio();
  };

  const unsubscribeHalt = emulator.events.subscribe('EmulatorHalted', (event) => {
    setRunState('halted');
    stopBatteryTimer();
    notify({ kind: 'halted', reason: event.reason });
    publish(event);
  });

  if (audio) emulator.setAudioSink(audio);
  page?.addEventListener('visibilitychange', onVisibility);
  page?.addEventListener('pagehide', onPageHide);
  for (const type of UNLOCK_EVENTS) page?.addEventListener(type, onUserActivation);
  audio?.setVolume(settings.volume);
  audio?.setMuted(settings.muted);
  if (audio && !audio.unlocked) state = { ...state, notice: { kind: 'audio-locked' } };

  const project: ProjectStateSource = { subscribe: () => () => undefined, getSnapshot: () => null };

  return {
    frameState: emulator.frameState,
    events: bus,
    project,
    session: {
      subscribe(onChange) {
        listeners.add(onChange);
        return () => {
          listeners.delete(onChange);
        };
      },
      getSnapshot: () => state,
    },
    dispatch(action) {
      // Unlocking audio must happen synchronously inside the user's event, not later from the queue.
      if (action.type === 'UnlockAudio') void unlockAudio();
      // One failing action must never block the ones after it (e.g. Replace, Start stored ROM).
      queue = queue
        .then(() => handle(action))
        .catch((error: unknown) => {
          console.error(`Action ${action.type} failed`, error);
        });
    },
    async init() {
      const stored = await romStore.load();
      update({ storedRomAvailable: stored !== null });
    },
    idle: () => queue,
    setGamepads(names) {
      update({ gamepads: [...names] });
    },
    dispose() {
      stopBatteryTimer();
      unsubscribeHalt();
      page?.removeEventListener('visibilitychange', onVisibility);
      page?.removeEventListener('pagehide', onPageHide);
      for (const type of UNLOCK_EVENTS) page?.removeEventListener(type, onUserActivation);
    },
  };
}
