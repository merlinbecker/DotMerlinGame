// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RomLoadError } from '../../src/core/index.ts';
import { createSameBoyEmulator } from '../../src/adapters/emulator/sameboy/sameboy-emulator.ts';
import { hashBytes, testRom } from '../support/roms.ts';

/**
 * Reading emulator state for views must not change the game (FR-012, SC-003, research.md R1/R2): screen and
 * every audio sample after 300 frames are identical whether no snapshot, or a snapshot every frame is built.
 */
const FRAMES = 300;
const names = Object.keys(JSON.parse(readFileSync('tests/roms/src/roms.json', 'utf8')) as Record<string, unknown>);

type Mode = 'none' | 'every-frame';

async function run(name: string, mode: Mode) {
  const emulator = await createSameBoyEmulator({ clock: null });
  const audio: number[] = [];
  emulator.setAudioSink({ sampleRate: 48000, push: (s) => audio.push(hashBytes(new Uint8Array(s.buffer, s.byteOffset, s.byteLength))) });
  try {
    await emulator.loadRom(testRom(name), { bootMode: 'own-boot-rom', hardwareChecks: false });
  } catch (error) {
    if (error instanceof RomLoadError) return null;
    throw error;
  }
  if (mode === 'every-frame') {
    emulator.frameState.setPublishRate({ kind: 'full' });
    emulator.frameState.subscribe(() => undefined);
  }
  emulator.run();
  emulator.advance(FRAMES);
  // Read the result only after the last compared frame.
  emulator.frameState.subscribe(() => undefined);
  emulator.frameState.requestSnapshot();
  const screen = emulator.frameState.getSnapshot()?.screen ?? new Uint8Array();
  return { screen: hashBytes(screen), audio: hashBytes(new Uint8Array(new Uint32Array(audio).buffer)), samples: audio.length };
}

describe('inspection identity (SC-003)', () => {
  it.each(names)('gives the same picture and sound with and without snapshots (%s)', async (name) => {
    const without = await run(name, 'none');
    const withSnapshots = await run(name, 'every-frame');
    expect(withSnapshots).toEqual(without);
  });
  it.todo('gives the same picture and sound with inspection data in every frame (enabled in T018)');
});
