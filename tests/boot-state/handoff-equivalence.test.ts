// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { atHandoff, memory } from '../support/emulator.ts';

describe('hand-off equivalence of both start modes (research.md R6)', () => {
  it.each(['boot-regs', 'boot-regs-cs00', 'mbc5-battery'])('%s: registers and $8000-$FFFF are identical at $0100', async (name) => {
    const boot = await atHandoff(name, 'own-boot-rom');
    const direct = await atHandoff(name, 'direct-start');
    expect(direct.cpuRegisters()).toEqual(boot.cpuRegisters());
    for (const [label, start, end] of [
      ['VRAM', 0x8000, 0xa000],
      ['WRAM', 0xc000, 0xe000],
      ['OAM', 0xfe00, 0xfea0],
      ['I/O', 0xff00, 0xff80],
      ['HRAM + IE', 0xff80, 0x10000],
    ] as const) {
      expect(memory(direct, start, end), label).toEqual(memory(boot, start, end));
    }
  });

  it('leaves VRAM cleared (decision A, ADR-0004)', async () => {
    const boot = await atHandoff('boot-regs', 'own-boot-rom');
    expect(memory(boot, 0x8000, 0xa000).every((b) => b === 0)).toBe(true);
  });
});
