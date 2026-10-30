// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import createRgbasm from '../../src/adapters/assembler/rgbds/generated/rgbasm.mjs';
import createRgbfix from '../../src/adapters/assembler/rgbds/generated/rgbfix.mjs';
import createRgblink from '../../src/adapters/assembler/rgbds/generated/rgblink.mjs';
import { runPipeline } from '../../src/adapters/assembler/rgbds/pipeline.ts';
import { createSameBoyEmulator } from '../../src/adapters/emulator/sameboy/sameboy-emulator.ts';
import { computeHeaderChecksum, logoMatches, type BootMode, type ProjectSettings } from '../../src/core/index.ts';

const dir = 'examples/hello';
const { settings } = JSON.parse(readFileSync(`${dir}/project.json`, 'utf8')) as { settings: ProjectSettings };
const files = ['main.asm', 'hardware.inc'].map((path) => ({ path, content: readFileSync(`${dir}/${path}`) }));
const build = () => runPipeline({ rgbasm: createRgbasm, rgblink: createRgblink, rgbfix: createRgbfix }, files, settings);

async function run(rom: Uint8Array, bootMode: BootMode) {
  const emulator = await createSameBoyEmulator({ clock: null });
  await emulator.loadRom(rom, { bootMode, hardwareChecks: true });
  if (!emulator.runUntilHandoff()) throw new Error('no hand-off');
  emulator.frameState.setPublishRate({ kind: 'full' });
  let screen = new Uint8Array();
  const stop = emulator.frameState.subscribe(() => {
    screen = emulator.frameState.getSnapshot()?.screen.slice() ?? screen;
  });
  emulator.run();
  emulator.advance(300);
  stop();
  return screen;
}

describe('example project hello (SC-001)', () => {
  it('builds without messages and has a valid header', async () => {
    const result = await build();
    expect(result.diagnostics).toEqual([]);
    const rom = result.rom ?? new Uint8Array();
    await expect(logoMatches(rom)).resolves.toBe(true);
    expect(rom[0x14d]).toBe(computeHeaderChecksum(rom));
  });

  it('runs and shows more than one shade, the same with and without our boot ROM', async () => {
    const rom = (await build()).rom ?? new Uint8Array();
    const boot = await run(rom, 'own-boot-rom');
    const direct = await run(rom, 'direct-start');
    expect(new Set(boot).size).toBeGreaterThan(1);
    expect(direct).toEqual(boot);
  });
});
