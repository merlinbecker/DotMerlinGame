import type { BootMode } from '../../src/core/index.ts';
import { createSameBoyEmulator, type SameBoyEmulator } from '../../src/adapters/emulator/sameboy/sameboy-emulator.ts';
import { hashBytes, testRom } from './roms.ts';

/** Loads a test ROM and stops at the hand-off to $0100. */
export async function atHandoff(name: string, bootMode: BootMode): Promise<SameBoyEmulator> {
  const emulator = await createSameBoyEmulator({ clock: null });
  await emulator.loadRom(testRom(name), { bootMode, hardwareChecks: false });
  if (!emulator.runUntilHandoff()) throw new Error(`no hand-off for ${name}`);
  return emulator;
}


export function memory(emulator: SameBoyEmulator, start: number, end: number): Uint8Array {
  const bytes = new Uint8Array(end - start);
  for (let i = 0; i < bytes.length; i++) bytes[i] = emulator.peek(start + i);
  return bytes;
}

/** Screen and audio hashes over `frames` frames from now on. */
export function output(emulator: SameBoyEmulator, frames: number) {
  const audio: number[] = [];
  emulator.setAudioSink({ sampleRate: 48000, push: (s) => audio.push(hashBytes(new Uint8Array(s.buffer, s.byteOffset, s.byteLength))) });
  const screens: number[] = [];
  const unsubscribe = emulator.frameState.subscribe(() => {
    const s = emulator.frameState.getSnapshot();
    if (s) screens.push(hashBytes(s.screen));
  });
  emulator.frameState.setPublishRate({ kind: 'full' });
  emulator.run();
  emulator.advance(frames);
  unsubscribe();
  return { screens: hashBytes(new Uint8Array(new Uint32Array(screens).buffer)), audio: hashBytes(new Uint8Array(new Uint32Array(audio).buffer)) };
}
