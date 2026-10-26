import { describe, expect, it } from 'vitest';
import { IO_REGISTER_NAMES, ioRegisterName } from '../../src/core/inspect/io-registers.ts';

describe('I/O register names (Pan Docs "Hardware Registers", research.md R9)', () => {
  it('names the 43 DMG registers from $FF00 to $FF50', () => {
    expect(IO_REGISTER_NAMES.size).toBe(43);
    expect(ioRegisterName(0xff00)).toBe('P1/JOYP');
    expect(ioRegisterName(0xff40)).toBe('LCDC');
    expect(ioRegisterName(0xff4b)).toBe('WX');
    expect(ioRegisterName(0xff50)).toBe('BANK');
    expect(ioRegisterName(0xff26)).toBe('NR52');
  });

  it('names the whole wave RAM range', () => {
    for (let address = 0xff30; address <= 0xff3f; address++) expect(ioRegisterName(address)).toBe('Wave RAM');
    expect(ioRegisterName(0xff2f)).toBeNull();
  });

  it.each([0xff03, 0xff4d, 0xff4f, 0xff51, 0xff55, 0xff68, 0xff6c, 0xff70, 0xff76, 0xffff])('has no name for $%s', (address) => {
    expect(ioRegisterName(address)).toBeNull();
  });
});
