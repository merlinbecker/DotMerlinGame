// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmulatorSession, DIAGNOSTICS_INTERVAL_MS } from '../../src/app/session/emulator-session.ts';
import { SETTINGS_KEY } from '../../src/app/session/settings-store.ts';
import { fakeAudio, fakeEmulator, fakePage, memoryRomStore } from '../support/fakes.ts';
import { testRom } from '../support/roms.ts';

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v), removeItem: (k: string) => data.delete(k) });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('emulator session audio (US4)', () => {
  it('connects the audio output to the emulator', () => {
    const emulator = fakeEmulator();
    const audio = fakeAudio();
    createEmulatorSession({ emulator, romStore: memoryRomStore(), audio });
    expect(emulator.setAudioSink).toHaveBeenCalledWith(audio);
  });

  it('shows the audio-locked notice until the first tap unlocks sound', async () => {
    const audio = fakeAudio();
    const page = fakePage();
    const session = createEmulatorSession({ emulator: fakeEmulator(), romStore: memoryRomStore(), audio, page });
    expect(session.session.getSnapshot().notice).toEqual({ kind: 'audio-locked' });
    page.fire('pointerdown'); // not a user activation on touch screens
    expect(audio.unlock).not.toHaveBeenCalled();
    page.fire('pointerup');
    expect(audio.unlock).toHaveBeenCalledTimes(1); // synchronously inside the event
    await session.idle();
    expect(session.session.getSnapshot()).toMatchObject({ notice: null, audio: { unlocked: true } });
  });

  it('tries again on the next tap if the browser did not allow it', async () => {
    const audio = fakeAudio();
    audio.unlock.mockImplementationOnce(() => Promise.reject(new Error('not allowed')));
    const page = fakePage();
    const session = createEmulatorSession({ emulator: fakeEmulator(), romStore: memoryRomStore(), audio, page });
    page.fire('touchend');
    await session.idle();
    expect(session.session.getSnapshot().notice).toEqual({ kind: 'audio-locked' });
    page.fire('click');
    await vi.waitFor(() => {
      expect(session.session.getSnapshot().audio.unlocked).toBe(true);
    });
  });

  it('unlocks from the Enable sound button through UnlockAudio', () => {
    const audio = fakeAudio();
    const session = createEmulatorSession({ emulator: fakeEmulator(), romStore: memoryRomStore(), audio });
    session.dispatch({ type: 'UnlockAudio' });
    expect(audio.unlock).toHaveBeenCalledTimes(1);
  });

  it('keeps working when the browser never answers the unlock request (phone bug)', async () => {
    const audio = fakeAudio();
    audio.unlock.mockImplementation(() => new Promise<void>(() => undefined)); // pending forever
    const emulator = fakeEmulator();
    const page = fakePage();
    const session = createEmulatorSession({ emulator, romStore: memoryRomStore(), audio, page });
    page.fire('pointerup');
    session.dispatch({ type: 'UnlockAudio' });
    session.dispatch({ type: 'LoadRom', bytes: testRom('marker'), fileName: 'm.gb' });
    await session.idle();
    expect(emulator.run).toHaveBeenCalled();
    expect(session.session.getSnapshot().runState).toBe('running');
  });

  it('applies mute and volume immediately, persists them and leaves emulation alone', async () => {
    const emulator = fakeEmulator();
    const audio = fakeAudio(true);
    const session = createEmulatorSession({ emulator, romStore: memoryRomStore(), audio });
    session.dispatch({ type: 'LoadRom', bytes: testRom('marker'), fileName: 'm.gb' });
    session.dispatch({ type: 'SetMuted', muted: true });
    session.dispatch({ type: 'SetVolume', volume: 0.8 });
    await session.idle();
    expect(audio.setMuted).toHaveBeenLastCalledWith(true);
    expect(audio.setVolume).toHaveBeenLastCalledWith(0.8);
    expect(emulator.pause).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')).toMatchObject({ muted: true, volume: 0.8 });
    expect(session.session.getSnapshot().audio).toMatchObject({ muted: true, volume: 0.8 });
  });

  it('suspends sound on pause and background and resumes it afterwards (FR-020)', async () => {
    const audio = fakeAudio(true);
    const page = fakePage();
    const session = createEmulatorSession({ emulator: fakeEmulator(), romStore: memoryRomStore(), audio, page });
    session.dispatch({ type: 'LoadRom', bytes: testRom('marker'), fileName: 'm.gb' });
    await session.idle();
    session.dispatch({ type: 'Pause' });
    await session.idle();
    expect(audio.suspend).toHaveBeenCalledTimes(1);
    session.dispatch({ type: 'Resume' });
    await session.idle();
    expect(audio.resume).toHaveBeenCalled();
    page.visibilityState = 'hidden';
    page.fire('visibilitychange');
    await vi.waitFor(() => {
      expect(audio.suspend).toHaveBeenCalledTimes(2);
    });
  });

  it('refreshes diagnostics once per second while running (SC-003, SC-007)', async () => {
    vi.useFakeTimers();
    const diagnostics = vi.fn(() => ({ frameTimeP95Ms: 1.5, frameWorkP95Ms: 2.5, emulatedFps: 59.7, audioUnderflows: 0, audioOverflows: 0 }));
    const session = createEmulatorSession({ emulator: fakeEmulator(), romStore: memoryRomStore(), diagnostics });
    session.dispatch({ type: 'LoadRom', bytes: testRom('marker'), fileName: 'm.gb' });
    await session.idle();
    await vi.advanceTimersByTimeAsync(DIAGNOSTICS_INTERVAL_MS);
    expect(session.session.getSnapshot().diagnostics.frameTimeP95Ms).toBe(1.5);
    expect(session.session.getSnapshot().diagnostics).toMatchObject({ frameWorkP95Ms: 2.5, emulatedFps: 59.7 });
  });
});

describe('emulator session game controllers (FR-006)', () => {
  it('shows connected game controllers in the session state', () => {
    const session = createEmulatorSession({ emulator: fakeEmulator(), romStore: memoryRomStore() });
    expect(session.session.getSnapshot().gamepads).toEqual([]);
    session.setGamepads(['8BitDo SN30 Pro']);
    expect(session.session.getSnapshot().gamepads).toEqual(['8BitDo SN30 Pro']);
  });
});
