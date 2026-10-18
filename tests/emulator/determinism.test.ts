// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Button } from '../../src/core/index.ts';
import { createSameBoyEmulator } from '../../src/adapters/emulator/sameboy/sameboy-emulator.ts';
import { hashBytes, testRom } from '../support/roms.ts';

const inputs: readonly [number, Button, boolean][] = [
  [10, 'A', true],
  [20, 'A', false],
  [40, 'Right', true],
  [41, 'Up', true],
  [80, 'Right', false],
  [81, 'Up', false],
];

async function run(name: string) {
  const emulator = await createSameBoyEmulator();
  const audio: number[] = [];
  emulator.setAudioSink({ sampleRate: 48000, push: (samples) => audio.push(hashBytes(new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength))) });
  await emulator.loadRom(testRom(name), { bootMode: 'direct-start', hardwareChecks: false });
  emulator.frameState.subscribe(() => undefined);
  emulator.run();
  for (let frame = 0; frame < 300; frame++) {
    for (const [at, button, pressed] of inputs) if (at === frame) emulator.setButton(button, pressed);
    emulator.advance(1);
  }
  const snapshot = emulator.frameState.getSnapshot();
  return { screen: hashBytes(snapshot?.screen ?? new Uint8Array()), registers: snapshot?.registers, audio: hashBytes(new Uint8Array(new Uint32Array(audio).buffer)) };
}

describe('determinism', () => {
  it.each(['input', 'pattern', 'apu-ch1'])('gives identical output for identical input (%s)', async (name) => {
    expect(await run(name)).toEqual(await run(name));
  });
});
