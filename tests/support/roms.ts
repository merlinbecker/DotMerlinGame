import { readFileSync } from 'node:fs';

/** Loads a test ROM built by scripts/build-test-roms.ts (pretest). */
export function testRom(name: string): Uint8Array {
  return new Uint8Array(readFileSync(`tests/roms/build/${name}.gb`));
}

/** WRAM result locations, see tests/roms/src/hardware.inc. */
export const W_RESULT = 0xc000;
export const W_DONE = 0xc0ff;
export const DONE = 0x42;

export function hashBytes(bytes: Uint8Array): number {
  let hash = 2166136261;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
  return hash;
}
