// @vitest-environment node
import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { atHandoff, output } from '../support/emulator.ts';

const ROMS = readdirSync('tests/roms/build')
  .filter((file) => file.endsWith('.gb'))
  .map((file) => file.replace(/\.gb$/, ''))
  .filter((name) => !name.startsWith('bad-') && name !== 'cgb-only');

describe('every test ROM runs identically in both start modes (FR-010, SC-002, Constitution VII)', () => {
  it('covers the test ROMs', () => {
    expect(ROMS.length).toBeGreaterThanOrEqual(10);
  });

  it.each(ROMS)('%s: same picture and sound for 300 frames after the hand-off', async (name) => {
    const boot = await atHandoff(name, 'own-boot-rom');
    const direct = await atHandoff(name, 'direct-start');
    expect(output(direct, 300)).toEqual(output(boot, 300));
  });
});
