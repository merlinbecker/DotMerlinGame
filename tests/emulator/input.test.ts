// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Button } from '../../src/core/index.ts';
import { createSameBoyEmulator } from '../../src/adapters/emulator/sameboy/sameboy-emulator.ts';
import { testRom, W_RESULT } from '../support/roms.ts';

// Bit layout written by tests/roms/src/input.asm.
const BIT: Record<Button, number> = { A: 0x01, B: 0x02, Select: 0x04, Start: 0x08, Right: 0x10, Left: 0x20, Up: 0x40, Down: 0x80 };

async function inputRom() {
  const emulator = await createSameBoyEmulator();
  await emulator.loadRom(testRom('input'), { bootMode: 'direct-start', hardwareChecks: false });
  emulator.run();
  emulator.advance(2);
  return emulator;
}

describe('controller input', () => {
  it.each(Object.keys(BIT) as Button[])('sees %s within one frame (SC-004)', async (button) => {
    const emulator = await inputRom();
    emulator.setButton(button, true);
    emulator.advance(1);
    expect(emulator.peek(W_RESULT)).toBe(BIT[button]);
    emulator.setButton(button, false);
    emulator.advance(1);
    expect(emulator.peek(W_RESULT)).toBe(0);
  });

  it('sees several buttons at once (Right + A)', async () => {
    const emulator = await inputRom();
    emulator.setButton('Right', true);
    emulator.setButton('A', true);
    emulator.advance(1);
    expect(emulator.peek(W_RESULT)).toBe(BIT.Right | BIT.A);
  });

  it('keeps a button that is still held after repeated taps', async () => {
    const emulator = await inputRom();
    for (let i = 0; i < 5; i++) {
      emulator.setButton('B', true);
      emulator.setButton('B', false);
    }
    emulator.setButton('B', true);
    emulator.advance(1);
    expect(emulator.peek(W_RESULT)).toBe(BIT.B);
  });
});
