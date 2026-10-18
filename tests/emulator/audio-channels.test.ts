// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSameBoyEmulator } from '../../src/adapters/emulator/sameboy/sameboy-emulator.ts';
import { DMG_FRAME_RATE } from '../../src/adapters/emulator/frame-clock.ts';
import { testRom } from '../support/roms.ts';

const SAMPLE_RATE = 48000;

async function play(name: string, frames: number) {
  const emulator = await createSameBoyEmulator({ clock: null });
  const chunks: Int16Array[] = [];
  emulator.setAudioSink({ sampleRate: SAMPLE_RATE, push: (samples) => chunks.push(samples) });
  await emulator.loadRom(testRom(name), { bootMode: 'direct-start', hardwareChecks: false });
  emulator.run();
  emulator.advance(frames);
  return chunks;
}

describe('sound output (FR-018, US4-AS5)', () => {
  it.each(['apu-ch1', 'apu-ch2', 'apu-ch3', 'apu-ch4'])('%s produces audible samples', async (name) => {
    const chunks = await play(name, 120);
    const tail = chunks.slice(-30);
    const peak = Math.max(...tail.flatMap((c) => [...c].map(Math.abs)));
    expect(peak).toBeGreaterThan(1000);
  });

  it('delivers about sampleRate / frame rate stereo samples per frame', async () => {
    const chunks = await play('apu-ch1', 120);
    const perFrame = chunks.slice(10).map((c) => c.length / 2);
    const average = perFrame.reduce((a, b) => a + b, 0) / perFrame.length;
    expect(average).toBeCloseTo(SAMPLE_RATE / DMG_FRAME_RATE, -1);
    for (const n of perFrame) expect(Math.abs(n - SAMPLE_RATE / DMG_FRAME_RATE)).toBeLessThanOrEqual(2);
  });

  it('stays quiet without a playing channel: marker ROM after the boot sound has decayed', async () => {
    // A DC offset may remain (DAC on, volume 0); what matters is that there is no waveform.
    const std = (chunks: Int16Array[]) => {
      const values = chunks.slice(-10).flatMap((c) => [...c]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
    };
    expect(std(await play('marker', 120))).toBeLessThan(std(await play('apu-ch1', 120)) / 20);
  });
});
