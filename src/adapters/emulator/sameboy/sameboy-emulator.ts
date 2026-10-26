import { createDomainEventBus } from '../../../core/events/domain-event-bus.ts';
import { createFrameStateHub } from '../../../core/events/frame-state-hub.ts';
import {
  RomLoadError,
  validateForLoad,
  type AudioOutputPort,
  type AudioSink,
  type Button,
  type EmulatorPort,
  type CartRamSnapshot,
  type FrameSnapshot,
  type InspectionSnapshot,
  type LoadRomOptions,
  type MemoryRange,
  type Registers,
  type RomHeaderInfo,
} from '../../../core/index.ts';
import { DMG_BOOT_ROM } from '../bootrom/generated/dmg-boot.ts';
import { browserClock, bufferPacing, type FrameClock } from '../frame-clock.ts';
import createSameBoy, { type SameBoyModule } from './generated/sameboy.mjs';

const SCREEN_BYTES = 160 * 144;
const DIRTY_BASE = 0x8000;
/** Areas of wrapper.c dmg_area (contracts/wasm-abi.md); the ROM comes from the adapter's own copy. */
const AREA_VRAM = 1;
const AREA_WRAM = 2;
const AREA_OAM = 3;
const AREA_HRAM = 4;
const AREA_CART_RAM = 5;
const CART_RAM_BANK = 0x2000;
const DIRTY_PAGES = 128;
const PAGE = 256;
const DEFAULT_SAMPLE_RATE = 48000;
const RUN_FRAME = 0;
const RUN_HANDOFF = 1;
/** About 5 minutes of frames for the frame time statistics. */
const FRAME_TIME_WINDOW = 18_000;
/** Time window for the emulated frame rate and the size of its timestamp ring (60 s at ~60 frames/s). */
const FPS_WINDOW_MS = 60_000;
const FPS_RING = 4096;

function p95(values: Float32Array, total: number): number | null {
  const count = Math.min(total, values.length);
  if (count === 0) return null;
  const sorted = values.slice(0, count).sort();
  return sorted[Math.min(count - 1, Math.floor(count * 0.95))] ?? null;
}

function isAudioOutput(sink: AudioSink): sink is AudioOutputPort {
  return 'bufferedSamples' in sink && 'unlocked' in sink;
}

/** Key bits in the order of SameBoy's GB_key_t (wrapper.c dmg_set_keys). */
const KEY_BITS: Record<Button, number> = { Right: 1, Left: 2, Up: 4, Down: 8, A: 16, B: 32, Select: 64, Start: 128 };

export interface SameBoyEmulator extends EmulatorPort {
  /** Emulates up to `frames` frames while running; called by the frame clock. */
  advance(frames: number): void;
  readonly running: boolean;
  /** Side-effect-free memory read (tests, later the debugger). */
  peek(address: number): number;
  /** Current CPU registers (tests, later the debugger). */
  cpuRegisters(): Registers;
  /** 95th percentile of the emulation time per frame over the last ~5 minutes (SC-003). */
  frameTimeP95Ms(): number | null;
  /** 95th percentile of emulation plus snapshot building and delivery per frame (SC-002 of M1b). */
  frameWorkP95Ms(): number | null;
  /** Emulated frames per second over the last minute; null before two frames. */
  emulatedFps(): number | null;
  /** Header of the loaded ROM, null before the first successful load. */
  readonly header: RomHeaderInfo | null;
  /**
   * Test helper: emulates until the hand-off to $0100 (own boot ROM) or returns at once (direct start).
   * Only for valid ROMs; hardware checks are not applied here. Returns false if no hand-off came.
   */
  runUntilHandoff(maxFrames?: number): boolean;
}

export interface SameBoyOptions {
  /** Boot ROM (256 bytes); defaults to the own DotMerlinGame boot ROM (ADR-0004). */
  readonly bootRom?: Uint8Array;
  /**
   * Creates the real-time clock that calls advance() while running. Default: requestAnimationFrame in
   * browsers, none elsewhere (tests drive advance() themselves).
   */
  readonly clock?: ((onFrames: (frames: number) => void, pacing: () => number) => FrameClock) | null;
}

/** Copies bytes into the WASM heap, calls `use`, frees the copy. */
function withHeapCopy<T>(module: SameBoyModule, bytes: Uint8Array, use: (pointer: number) => T): T {
  const pointer = module._malloc(bytes.length);
  module.HEAPU8.set(bytes, pointer);
  try {
    return use(pointer);
  } finally {
    module._free(pointer);
  }
}

/**
 * One memory area of the core, read without side effects (research.md R1); empty if the core has none. A
 * copy only when `copy` is set: views into the WASM heap are valid until the next call into the core, which
 * is enough for changedMemory and keeps M1 free of per-frame copies without a memory view (research.md R4).
 */
function readArea(module: SameBoyModule, area: number, sizePointer: number, copy: boolean): Uint8Array {
  const pointer = module._dmg_area(area, sizePointer);
  const size = new DataView(module.HEAPU8.buffer).getUint32(sizePointer, true);
  if (!pointer || !size) return new Uint8Array(0);
  return copy ? module.HEAPU8.slice(pointer, pointer + size) : module.HEAPU8.subarray(pointer, pointer + size);
}

/** The writable areas at $8000–$FFFF as the core holds them; the source for inspection and changedMemory. */
interface UpperMemory {
  readonly vram: Uint8Array;
  readonly cartRam: Uint8Array;
  readonly cartRamBank: number;
  readonly wram: Uint8Array;
  readonly oam: Uint8Array;
  readonly io: Uint8Array;
  readonly hram: Uint8Array;
  readonly ie: number;
}

/**
 * Value at `address` ($8000–$FFFF) from the copied areas, or null where no memory is shown: echo RAM,
 * $FEA0–$FEFF and missing cartridge RAM (contracts/frame-state.md rule 8).
 */
function upperByte(memory: UpperMemory, address: number): number | null {
  if (address < 0xa000) return memory.vram[address - 0x8000] ?? null;
  if (address < 0xc000) return memory.cartRam.length ? (memory.cartRam[(memory.cartRamBank * CART_RAM_BANK + address - 0xa000) % memory.cartRam.length] ?? null) : null;
  if (address < 0xe000) return memory.wram[address - 0xc000] ?? null;
  if (address < 0xfe00) return null;
  if (address < 0xfea0) return memory.oam[address - 0xfe00] ?? null;
  if (address < 0xff00) return null;
  if (address < 0xff80) return memory.io[address - 0xff00] ?? null;
  if (address < 0xffff) return memory.hram[address - 0xff80] ?? null;
  return memory.ie;
}

/** Memory written since the last snapshot, read from the copied areas instead of the CPU read path (research.md R2). */
function changedRanges(module: SameBoyModule, memory: UpperMemory): MemoryRange[] {
  const dirty = module.HEAPU8.subarray(module._dmg_dirty_pages(), module._dmg_dirty_pages() + DIRTY_PAGES);
  const ranges: MemoryRange[] = [];
  let open: number[] = [];
  let openStart = 0;
  const close = () => {
    if (open.length) ranges.push({ start: openStart, bytes: Uint8Array.from(open) });
    open = [];
  };
  for (let page = 0; page < DIRTY_PAGES; page++) {
    if (!dirty[page]) {
      close();
      continue;
    }
    for (let offset = 0; offset < PAGE; offset++) {
      const address = DIRTY_BASE + page * PAGE + offset;
      const value = upperByte(memory, address);
      if (value === null) {
        close();
        continue;
      }
      if (!open.length) openStart = address;
      open.push(value);
    }
  }
  close();
  module._dmg_dirty_clear();
  return ranges;
}

/** SameBoy core (ADR-0006) behind the EmulatorPort. Fremdcode stays in generated/; this is the only importer. */
export async function createSameBoyEmulator(options: SameBoyOptions = {}): Promise<SameBoyEmulator> {
  const module = await createSameBoy();
  if (module._dmg_init(DEFAULT_SAMPLE_RATE) !== 0) throw new Error('SameBoy core failed to initialize');

  const bootRom = options.bootRom ?? DMG_BOOT_ROM;
  withHeapCopy(module, bootRom, (p) => module._dmg_load_boot_rom(p, bootRom.length));
  let handoffCaptured = false;
  const frameState = createFrameStateHub();
  const events = createDomainEventBus();
  const registersPointer = module._malloc(12);
  const sizePointer = module._malloc(4);
  const ioPointer = module._malloc(0x80);
  const banksPointer = module._malloc(6);
  /** One copy of the loaded ROM, shared by all inspection snapshots of this ROM. */
  let romImage = new Uint8Array(0);
  let header: RomHeaderInfo | null = null;
  let loadOptions: LoadRomOptions | null = null;
  let running = false;
  let halted = false;
  let frame = 0;
  let keys = 0;
  let sink: AudioSink | null = null;
  const clockFactory = options.clock === undefined ? (typeof requestAnimationFrame === 'function' ? browserClock : null) : options.clock;
  const pacing = () => (sink && isAudioOutput(sink) && sink.unlocked ? bufferPacing(sink.bufferedSamples, sink.sampleRate) : 0);
  const clock: FrameClock | null = clockFactory
    ? clockFactory((frames) => {
        emulator.advance(frames);
      }, pacing)
    : null;
  const frameTimes = new Float32Array(FRAME_TIME_WINDOW);
  const frameWork = new Float32Array(FRAME_TIME_WINDOW);
  const frameStamps = new Float64Array(FPS_RING);
  let frameStampCount = 0;
  let frameTimeCount = 0;

  const readRegisters = (): Registers => {
    module._dmg_registers(registersPointer);
    const [af = 0, bc = 0, de = 0, hl = 0, sp = 0, pc = 0] = module.HEAPU16.subarray(registersPointer / 2, registersPointer / 2 + 6);
    return { a: af >> 8, f: af & 0xff, b: bc >> 8, c: bc & 0xff, d: de >> 8, e: de & 0xff, h: hl >> 8, l: hl & 0xff, sp, pc };
  };

  /** Copies for inspection snapshots, heap views otherwise (only read before the next call into the core). */
  const readUpperMemory = (copy: boolean): UpperMemory => {
    module._dmg_io(ioPointer);
    module._dmg_banks(banksPointer);
    return {
      vram: readArea(module, AREA_VRAM, sizePointer, copy),
      cartRam: readArea(module, AREA_CART_RAM, sizePointer, copy),
      cartRamBank: module.HEAPU16[banksPointer / 2 + 2] ?? 0,
      wram: readArea(module, AREA_WRAM, sizePointer, copy),
      oam: readArea(module, AREA_OAM, sizePointer, copy),
      io: copy ? module.HEAPU8.slice(ioPointer, ioPointer + 0x80) : module.HEAPU8.subarray(ioPointer, ioPointer + 0x80),
      hram: readArea(module, AREA_HRAM, sizePointer, copy),
      ie: module._dmg_ie(),
    };
  };

  const inspection = (memory: UpperMemory): InspectionSnapshot => {
    let cartRam: CartRamSnapshot | null = null;
    if (memory.cartRam.length) {
      const bankCount = Math.max(1, Math.ceil(memory.cartRam.length / CART_RAM_BANK));
      const enabled = module._dmg_cart_ram_enabled();
      cartRam = { bytes: memory.cartRam, bankCount, bank: Math.min(memory.cartRamBank, bankCount - 1), enabled: enabled < 0 ? null : enabled === 1 };
    }
    const cpu = module._dmg_cpu_flags();
    return {
      rom: romImage,
      romBank: module.HEAPU16[banksPointer / 2] ?? 0,
      rom0Bank: module.HEAPU16[banksPointer / 2 + 1] ?? 0,
      vram: memory.vram,
      wram: memory.wram,
      oam: memory.oam,
      io: memory.io,
      hram: memory.hram,
      ie: memory.ie,
      cartRam,
      cpu: { ime: (cpu & 1) !== 0, halted: (cpu & 2) !== 0 },
    };
  };

  const snapshot = (withInspection: boolean): FrameSnapshot => {
    const registers = readRegisters();
    const memory = readUpperMemory(withInspection);
    const f = registers.f;
    const screenStart = module._dmg_screen();
    return {
      frame,
      cycles: module._dmg_cycles(),
      registers,
      // Flag bits of F: Z=7, N=6, H=5, C=4 (Pan Docs "CPU Registers and Flags").
      flags: { z: (f & 0x80) !== 0, n: (f & 0x40) !== 0, h: (f & 0x20) !== 0, c: (f & 0x10) !== 0 },
      changedMemory: changedRanges(module, memory),
      screen: module.HEAPU8.slice(screenStart, screenStart + SCREEN_BYTES),
      inspection: withInspection ? inspection(memory) : null,
    };
  };

  const flushAudio = () => {
    const count = module._dmg_audio_count();
    if (sink && count > 0) {
      const start = module._dmg_audio() / 2;
      sink.push(module.HEAP16.slice(start, start + count * 2));
    }
    module._dmg_audio_clear();
  };

  const headerValid = () => header !== null && header.logoValid && header.headerChecksumValid;

  const halt = () => {
    halted = true;
    running = false;
    clock?.stop();
    module._dmg_halt();
    frameState.prime(snapshot); // views can show the halted state on request (research.md R6)
    const reason = header?.logoValid === false ? 'header-logo' : 'header-checksum';
    events.publish({ type: 'EmulatorHalted', reason });
  };

  const start = () => {
    if (!loadOptions) return;
    const direct = loadOptions.bootMode === 'direct-start';
    module._dmg_set_halt_at_handoff(loadOptions.hardwareChecks ? 1 : 0);
    if (module._dmg_reset(direct ? 1 : 0) !== 0) throw new Error('Direct start failed: no hand-off snapshot');
    module._dmg_set_keys(keys);
    halted = false;
    frame = 0;
    frameState.prime(snapshot); // the new state is shown on request even before the first frame
  };

  const emulator: SameBoyEmulator = {
    frameState,
    events,
    get running() {
      return running;
    },
    get header() {
      return header;
    },
    get batteryRamDirty() {
      return module._dmg_battery_dirty() !== 0;
    },

    async loadRom(rom, nextOptions) {
      const validation = await validateForLoad(rom);
      if (!validation.ok) throw new RomLoadError(validation.reason);
      if (nextOptions.bootMode === 'direct-start' && !handoffCaptured) {
        // Snapshot of our boot ROM's hand-off, taken once with a neutral cartridge (research.md R6).
        if (module._dmg_capture_handoff() !== 0) throw new Error('Could not capture the hand-off state');
        handoffCaptured = true;
      }
      withHeapCopy(module, rom, (p) => module._dmg_load_rom(p, rom.length));
      header = validation.info;
      romImage = rom.slice();
      loadOptions = nextOptions;
      running = false;
      clock?.stop();
      start();
    },

    run() {
      if (!loadOptions || halted) return;
      running = true;
      clock?.start();
    },
    pause() {
      running = false;
      clock?.stop();
    },
    reset() {
      start();
    },

    advance(frames) {
      for (let i = 0; i < frames && running; i++) {
        const started = performance.now();
        let result = module._dmg_run_frame();
        if (result === RUN_HANDOFF) {
          flushAudio(); // boot ROM samples belong before the hand-off
          if (!headerValid()) {
            halt();
            return;
          }
          result = module._dmg_run_frame();
        }
        if (result !== RUN_FRAME) return;
        frameTimes[frameTimeCount % FRAME_TIME_WINDOW] = performance.now() - started;
        frame++;
        flushAudio();
        frameState.offer(frame, snapshot);
        const done = performance.now();
        frameWork[frameTimeCount++ % FRAME_TIME_WINDOW] = done - started;
        frameStamps[frameStampCount++ % FPS_RING] = done;
      }
    },

    frameTimeP95Ms: () => p95(frameTimes, frameTimeCount),
    frameWorkP95Ms: () => p95(frameWork, frameTimeCount),

    emulatedFps() {
      const now = performance.now();
      const stored = Math.min(frameStampCount, FPS_RING);
      let count = 0;
      let oldest = now;
      for (let i = 0; i < stored; i++) {
        const stamp = frameStamps[i] ?? 0;
        if (stamp <= now - FPS_WINDOW_MS) continue;
        count++;
        oldest = Math.min(oldest, stamp);
      }
      const span = now - oldest;
      return count >= 2 && span > 0 ? ((count - 1) * 1000) / span : null;
    },

    runUntilHandoff(maxFrames = 600) {
      module._dmg_set_halt_at_handoff(1);
      try {
        for (let i = 0; i < maxFrames; i++) {
          const result = module._dmg_run_frame();
          if (result === RUN_HANDOFF) {
            flushAudio();
            return true;
          }
          if (result !== RUN_FRAME) return false;
          frame++;
          flushAudio();
        }
        return false;
      } finally {
        module._dmg_set_halt_at_handoff(loadOptions?.hardwareChecks ? 1 : 0);
      }
    },

    setButton(button, pressed) {
      keys = pressed ? keys | KEY_BITS[button] : keys & ~KEY_BITS[button];
      module._dmg_set_keys(keys);
    },

    peek: (address) => module._dmg_peek(address & 0xffff),
    cpuRegisters: readRegisters,

    readBatteryRam() {
      if (!header?.cartridgeType.battery) return null;
      const size = module._dmg_battery_size();
      if (size <= 0) return null;
      const pointer = module._malloc(size);
      try {
        module._dmg_battery_save(pointer, size);
        return module.HEAPU8.slice(pointer, pointer + size);
      } finally {
        module._free(pointer);
      }
    },
    writeBatteryRam(data) {
      if (!header?.cartridgeType.battery) return;
      withHeapCopy(module, data, (p) => {
        module._dmg_battery_load(p, data.length);
      });
    },

    setAudioSink(next) {
      sink = next;
      module._dmg_set_sample_rate(next?.sampleRate ?? DEFAULT_SAMPLE_RATE);
    },

    step() {
      throw new Error('Step is not supported in M1 (planned for M4)');
    },
    setBreakpoint() {
      throw new Error('Breakpoints are not supported in M1 (planned for M4)');
    },
    clearBreakpoint() {
      throw new Error('Breakpoints are not supported in M1 (planned for M4)');
    },
  };
  return emulator;
}
