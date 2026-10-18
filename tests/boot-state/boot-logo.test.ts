// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { FrameSnapshot } from '../../src/core/index.ts';
import { createSameBoyEmulator } from '../../src/adapters/emulator/sameboy/sameboy-emulator.ts';
import { testRom } from '../support/roms.ts';

/** Expected logo, 3x3 tiles of 1 bpp rows, as in dmg-boot.asm (frame with a dot). */
const LOGO_ROWS = [
  [0xff, 0xff, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0], [0xff, 0xff, 0, 0, 0, 0, 0, 0], [0xff, 0xff, 3, 3, 3, 3, 3, 3],
  [0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0], [0x3c, 0x7e, 0xff, 0xff, 0xff, 0xff, 0x7e, 0x3c], [3, 3, 3, 3, 3, 3, 3, 3],
  [0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xff, 0xff], [0, 0, 0, 0, 0, 0, 0xff, 0xff], [3, 3, 3, 3, 3, 3, 0xff, 0xff],
];
const LOGO_X = 8 * 8; // map column 8
const LOGO_Y = 7 * 8; // map row 7

function expectedPixel(x: number, y: number): number {
  const lx = x - LOGO_X;
  const ly = y - LOGO_Y;
  if (lx < 0 || ly < 0 || lx >= 24 || ly >= 24) return 0;
  const tile = LOGO_ROWS[Math.floor(ly / 8) * 3 + Math.floor(lx / 8)] ?? [];
  return ((tile[ly % 8] ?? 0) >> (7 - (lx % 8))) & 1 ? 3 : 0; // BGP $FC: color 3 -> darkest
}

async function framesWithBootRom(count: number) {
  const emulator = await createSameBoyEmulator({ clock: null });
  await emulator.loadRom(testRom('marker'), { bootMode: 'own-boot-rom', hardwareChecks: false });
  const frames: FrameSnapshot[] = [];
  emulator.frameState.subscribe(() => {
    const s = emulator.frameState.getSnapshot();
    if (s) frames.push(s);
  });
  emulator.run();
  emulator.advance(count);
  return frames;
}

describe('own boot logo (US2-AS1)', () => {
  it('shows the own logo, centered, while the boot ROM runs', async () => {
    const frames = await framesWithBootRom(30);
    const screen = frames.at(-1)?.screen ?? new Uint8Array();
    const mismatches: string[] = [];
    for (let y = 0; y < 144; y++) for (let x = 0; x < 160; x++) if (screen[y * 160 + x] !== expectedPixel(x, y)) mismatches.push(`${x},${y}`);
    expect(mismatches).toEqual([]);
  });

  it('shows the game afterwards: VRAM is cleared, the logo is gone', async () => {
    const frames = await framesWithBootRom(120);
    expect(frames.at(-1)?.screen.every((shade) => shade === 0)).toBe(true);
  });
});
