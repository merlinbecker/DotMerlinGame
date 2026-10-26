import { describe, expect, it } from 'vitest';
import type { InspectionSnapshot } from '../../src/core/index.ts';
import { areaBanks, bytesOf, HEX_AREAS } from '../../src/core/inspect/areas.ts';

function inspection(romBanks: number, cartRam: InspectionSnapshot['cartRam']): InspectionSnapshot {
  const rom = new Uint8Array(romBanks * 0x4000).map((_, i) => i >> 14);
  return {
    rom,
    romBank: 1,
    rom0Bank: 0,
    vram: new Uint8Array(0x2000).fill(1),
    wram: new Uint8Array(0x2000).fill(2),
    oam: new Uint8Array(0xa0).fill(3),
    io: new Uint8Array(0x80).fill(4),
    hram: new Uint8Array(0x7f).fill(5),
    ie: 6,
    cartRam,
    cpu: { ime: false, halted: false },
  };
}

const ram = { bytes: new Uint8Array(0x8000).map((_, i) => i >> 13), bankCount: 4, bank: 0, enabled: true };

describe('memory areas of the Hex view (Pan Docs "Memory Map")', () => {
  it('lists the areas in address order', () => {
    expect(HEX_AREAS.map((a) => a.id)).toEqual(['rom', 'vram', 'cart-ram', 'wram', 'oam', 'io', 'hram', 'ie']);
  });

  it('maps ROM bank 0 to $0000 and bank n to $4000', () => {
    const data = inspection(8, null);
    expect(bytesOf('rom', 0, data)).toMatchObject({ base: 0x0000 });
    expect(bytesOf('rom', 0, data)?.bytes.length).toBe(0x4000);
    const bank5 = bytesOf('rom', 5, data);
    expect(bank5?.base).toBe(0x4000);
    expect(bank5?.bytes[0]).toBe(5);
    expect(bytesOf('rom', 8, data)).toBeNull();
    expect(areaBanks('rom', data)).toBe(8);
  });

  it('maps cartridge RAM bank n to $A000 and has none without RAM', () => {
    const data = inspection(2, ram);
    expect(bytesOf('cart-ram', 2, data)).toMatchObject({ base: 0xa000 });
    expect(bytesOf('cart-ram', 2, data)?.bytes[0]).toBe(2);
    expect(bytesOf('cart-ram', 4, data)).toBeNull();
    expect(areaBanks('cart-ram', data)).toBe(4);
    expect(bytesOf('cart-ram', 0, inspection(2, null))).toBeNull();
    expect(areaBanks('cart-ram', inspection(2, null))).toBe(0);
  });

  it('gives MBC2 RAM its 512 bytes as one bank', () => {
    const data = inspection(2, { bytes: new Uint8Array(0x200), bankCount: 1, bank: 0, enabled: false });
    expect(bytesOf('cart-ram', 0, data)?.bytes.length).toBe(0x200);
  });

  it.each([
    ['vram', 0x8000, 0x2000, 1],
    ['wram', 0xc000, 0x2000, 2],
    ['oam', 0xfe00, 0xa0, 3],
    ['io', 0xff00, 0x80, 4],
    ['hram', 0xff80, 0x7f, 5],
    ['ie', 0xffff, 1, 6],
  ] as const)('places %s at its base address', (area, base, size, value) => {
    const view = bytesOf(area, 0, inspection(2, null));
    expect(view?.base).toBe(base);
    expect(view?.bytes.length).toBe(size);
    expect(view?.bytes[0]).toBe(value);
  });
});
