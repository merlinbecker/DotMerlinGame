import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { FrameSnapshot, InspectionSnapshot } from '../../src/core/index.ts';

/**
 * Real snapshots of the M1b test ROMs for view tests in jsdom, where the WASM core cannot load. Recorded in
 * node by inspection-fixtures.setup.ts into tests/roms/build/ (never committed, like the ROMs).
 */
export const FIXTURE_ROMS = ['inspect-mem', 'inspect-regs', 'inspect-regs-halted', 'inspect-gfx', 'inspect-gfx-tall', 'mbc-none'] as const;
export type FixtureRom = (typeof FIXTURE_ROMS)[number];
/** Snapshots are taken after these frames; the ROMs are done well before. */
export const FIXTURE_FRAMES = [30, 31] as const;

const path = (name: string) => `tests/roms/build/${name}.inspection.json`;

const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');
const fromBase64 = (text: string) => new Uint8Array(Buffer.from(text, 'base64'));

type Json = Record<string, unknown>;

function encode(snapshot: FrameSnapshot): Json {
  const i = snapshot.inspection;
  if (!i) throw new Error('snapshot without inspection data');
  return {
    frame: snapshot.frame,
    cycles: snapshot.cycles,
    registers: snapshot.registers,
    flags: snapshot.flags,
    screen: toBase64(snapshot.screen),
    inspection: {
      romBank: i.romBank,
      rom0Bank: i.rom0Bank,
      vram: toBase64(i.vram),
      wram: toBase64(i.wram),
      oam: toBase64(i.oam),
      io: toBase64(i.io),
      hram: toBase64(i.hram),
      ie: i.ie,
      cartRam: i.cartRam && { ...i.cartRam, bytes: toBase64(i.cartRam.bytes) },
      cpu: i.cpu,
    },
  };
}

function decode(json: Json, rom: Uint8Array): FrameSnapshot {
  const i = json.inspection as Json;
  const cartRam = i.cartRam as (Json & { bytes: string }) | null;
  const inspection: InspectionSnapshot = {
    rom,
    romBank: i.romBank as number,
    rom0Bank: i.rom0Bank as number,
    vram: fromBase64(i.vram as string),
    wram: fromBase64(i.wram as string),
    oam: fromBase64(i.oam as string),
    io: fromBase64(i.io as string),
    hram: fromBase64(i.hram as string),
    ie: i.ie as number,
    cartRam: cartRam && {
      bytes: fromBase64(cartRam.bytes),
      bankCount: cartRam.bankCount as number,
      bank: cartRam.bank as number,
      enabled: cartRam.enabled as boolean | null,
    },
    cpu: i.cpu as InspectionSnapshot['cpu'],
  };
  return {
    frame: json.frame as number,
    cycles: json.cycles as number,
    registers: json.registers as FrameSnapshot['registers'],
    flags: json.flags as FrameSnapshot['flags'],
    changedMemory: [],
    screen: fromBase64(json.screen as string),
    inspection,
  };
}

export function writeFixture(name: string, snapshots: readonly FrameSnapshot[]): void {
  writeFileSync(path(name), JSON.stringify(snapshots.map(encode)));
}

/** The recorded snapshots of a test ROM, in FIXTURE_FRAMES order. */
export function fixtureSnapshots(name: FixtureRom): FrameSnapshot[] {
  if (!existsSync(path(name))) throw new Error(`missing ${path(name)}; it is recorded by the vitest global setup`);
  const rom = new Uint8Array(readFileSync(`tests/roms/build/${name}.gb`));
  return (JSON.parse(readFileSync(path(name), 'utf8')) as Json[]).map((json) => decode(json, rom));
}
