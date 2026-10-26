// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { FrameSnapshot, InspectionSnapshot } from '../../src/core/index.ts';
import { createSameBoyEmulator, type SameBoyEmulator } from '../../src/adapters/emulator/sameboy/sameboy-emulator.ts';
import { DONE, W_DONE, testRom } from '../support/roms.ts';

/** Runs a test ROM until it reports DONE (or for `frames` frames) with inspection demand on. */
async function inspect(name: string, frames = 30): Promise<{ emulator: SameBoyEmulator; snapshots: FrameSnapshot[] }> {
  const emulator = await createSameBoyEmulator({ clock: null });
  await emulator.loadRom(testRom(name), { bootMode: 'direct-start', hardwareChecks: false });
  emulator.frameState.setInspectionDemand(true);
  const snapshots: FrameSnapshot[] = [];
  emulator.frameState.subscribe(() => {
    const s = emulator.frameState.getSnapshot();
    if (s) snapshots.push(s);
  });
  emulator.run();
  emulator.advance(frames);
  return { emulator, snapshots };
}

function last(snapshots: readonly FrameSnapshot[]): InspectionSnapshot {
  const inspection = snapshots.at(-1)?.inspection;
  if (!inspection) throw new Error('no inspection data');
  return inspection;
}

describe('inspection data (SC-001, contracts/frame-state.md)', () => {
  it('is null without demand', async () => {
    const emulator = await createSameBoyEmulator({ clock: null });
    await emulator.loadRom(testRom('marker'), { bootMode: 'direct-start', hardwareChecks: false });
    emulator.frameState.subscribe(() => undefined);
    emulator.run();
    emulator.advance(2);
    expect(emulator.frameState.getSnapshot()?.inspection).toBeNull();
  });

  it('shows ROM banks, cartridge RAM banks, WRAM, HRAM and IE of inspect-mem', async () => {
    const { snapshots } = await inspect('inspect-mem');
    const data = last(snapshots);
    expect(data.wram[W_DONE - 0xc000]).toBe(DONE);
    expect(data.rom).toEqual(testRom('inspect-mem'));
    expect(snapshots.at(-2)?.inspection?.rom).toBe(data.rom);
    for (let bank = 1; bank < 8; bank++) expect(data.rom[bank * 0x4000]).toBe(bank);
    expect(data.romBank).toBe(3);
    expect(data.rom0Bank).toBe(0);

    const ram = data.cartRam;
    expect(ram?.bankCount).toBe(4);
    expect(ram?.bank).toBe(2);
    expect(ram?.enabled).toBe(false);
    for (let bank = 0; bank < 4; bank++) {
      expect(ram?.bytes[bank * 0x2000]).toBe(bank);
      expect(ram?.bytes[bank * 0x2000 + 1]).toBe(0xc0 + bank);
      expect(ram?.bytes[bank * 0x2000 + 0xff]).toBe(0xc0 + bank);
    }

    for (let i = 0; i < 0xff; i++) expect(data.wram[i]).toBe(i ^ 0x5a);
    for (let i = 0; i < 0x10; i++) expect(data.hram[i]).toBe(0x80 + i);
    expect(data.ie).toBe(0x05);
    expect([data.vram.length, data.wram.length, data.oam.length, data.io.length, data.hram.length]).toEqual([0x2000, 0x2000, 0xa0, 0x80, 0x7f]);
  });

  it('hands out copies, never views into the emulator', async () => {
    const { emulator, snapshots } = await inspect('inspect-mem');
    const data = last(snapshots);
    data.wram[0] = 0xee;
    data.vram[0] = 0xee;
    data.oam[0] = 0xee;
    emulator.advance(1);
    const next = last(snapshots);
    expect(next.wram[0]).toBe(0x5a);
    expect(next.vram).not.toBe(data.vram);
    expect(next.oam[0]).not.toBe(0xee);
  });

  it('has no cartridge RAM for a ROM without RAM', async () => {
    const { snapshots } = await inspect('mbc-none', 5);
    expect(last(snapshots).cartRam).toBeNull();
  });

  it('reads DIV from the internal divider and lets it run', async () => {
    const { emulator, snapshots } = await inspect('inspect-mem', 5);
    const div = last(snapshots).io[0x04];
    expect(div).toBe(emulator.peek(0xff04));
    emulator.advance(1);
    expect(last(snapshots).io[0x04]).not.toBe(div);
  });

  it('reports IME and HALT (FR-006)', async () => {
    const running = await inspect('inspect-regs', 10);
    expect(last(running.snapshots).cpu).toEqual({ ime: false, halted: false });
    const halted = await inspect('inspect-regs-halted', 10);
    expect(last(halted.snapshots).cpu).toEqual({ ime: true, halted: true });
  });

  it('shows VRAM and OAM of inspect-gfx', async () => {
    const { snapshots } = await inspect('inspect-gfx');
    const data = last(snapshots);
    // tile 300, row 5: low byte = 300 & $FF, high byte = 5 * $10 | (300 >> 8)
    expect(data.vram[300 * 16 + 10]).toBe(300 & 0xff);
    expect(data.vram[300 * 16 + 11]).toBe(0x50 | 1);
    expect(data.vram[0x1800 + 0x123]).toBe(0x23);
    expect(data.vram[0x1c00 + 0x123]).toBe(0x23 ^ 0xff);
    expect([...data.oam.subarray(0, 8)]).toEqual([16, 8, 1, 0x00, 80, 80, 2, 0x20]);
    expect(data.io[0x40]).toBe(0xf3);
    expect([data.io[0x42], data.io[0x43], data.io[0x4a], data.io[0x4b]]).toEqual([200, 100, 40, 87]);
  });
});
