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
    page.fire('pointerdown');
    await session.idle();
    expect(audio.unlock).toHaveBeenCalled();
    expect(session.session.getSnapshot()).toMatchObject({ notice: null, audio: { unlocked: true } });
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
    const diagnostics = vi.fn(() => ({ frameTimeP95Ms: 1.5, audioUnderflows: 0, audioOverflows: 0 }));
    const session = createEmulatorSession({ emulator: fakeEmulator(), romStore: memoryRomStore(), diagnostics });
    session.dispatch({ type: 'LoadRom', bytes: testRom('marker'), fileName: 'm.gb' });
    await session.idle();
    await vi.advanceTimersByTimeAsync(DIAGNOSTICS_INTERVAL_MS);
    expect(session.session.getSnapshot().diagnostics.frameTimeP95Ms).toBe(1.5);
  });
});
