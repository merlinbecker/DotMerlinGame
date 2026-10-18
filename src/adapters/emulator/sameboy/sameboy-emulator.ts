import { createDomainEventBus } from '../../../core/events/domain-event-bus.ts';
import { createFrameStateHub } from '../../../core/events/frame-state-hub.ts';
import {
  RomLoadError,
  validateForLoad,
  type AudioSink,
  type Button,
  type EmulatorPort,
  type FrameSnapshot,
  type LoadRomOptions,
  type MemoryRange,
  type Registers,
  type RomHeaderInfo,
} from '../../../core/index.ts';
import { DMG_BOOT_ROM } from '../bootrom/generated/dmg-boot.ts';
import { browserClock, type FrameClock } from '../frame-clock.ts';
import createSameBoy, { type SameBoyModule } from './generated/sameboy.mjs';

const SCREEN_BYTES = 160 * 144;
const DIRTY_BASE = 0x8000;
const DIRTY_PAGES = 128;
const PAGE = 256;
const DEFAULT_SAMPLE_RATE = 48000;
const RUN_FRAME = 0;
const RUN_HANDOFF = 1;

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
  readonly clock?: ((onFrames: (frames: number) => void) => FrameClock) | null;
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

function changedRanges(module: SameBoyModule): MemoryRange[] {
  const dirty = module.HEAPU8.subarray(module._dmg_dirty_pages(), module._dmg_dirty_pages() + DIRTY_PAGES);
  const ranges: MemoryRange[] = [];
  let page = 0;
  while (page < DIRTY_PAGES) {
    if (!dirty[page]) {
      page++;
      continue;
    }
    const first = page;
    while (page < DIRTY_PAGES && dirty[page]) page++;
    const start = DIRTY_BASE + first * PAGE;
    const bytes = new Uint8Array((page - first) * PAGE);
    for (let i = 0; i < bytes.length; i++) bytes[i] = module._dmg_peek(start + i);
    ranges.push({ start, bytes });
  }
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
  let header: RomHeaderInfo | null = null;
  let loadOptions: LoadRomOptions | null = null;
  let running = false;
  let halted = false;
  let frame = 0;
  let keys = 0;
  let sink: AudioSink | null = null;
  const clockFactory = options.clock === undefined ? (typeof requestAnimationFrame === 'function' ? browserClock : null) : options.clock;
  const clock: FrameClock | null = clockFactory ? clockFactory((frames) => { emulator.advance(frames); }) : null;

  const readRegisters = (): Registers => {
    module._dmg_registers(registersPointer);
    const [af = 0, bc = 0, de = 0, hl = 0, sp = 0, pc = 0] = module.HEAPU16.subarray(registersPointer / 2, registersPointer / 2 + 6);
    return { a: af >> 8, f: af & 0xff, b: bc >> 8, c: bc & 0xff, d: de >> 8, e: de & 0xff, h: hl >> 8, l: hl & 0xff, sp, pc };
  };

  const snapshot = (): FrameSnapshot => {
    const registers = readRegisters();
    const f = registers.f;
    const screenStart = module._dmg_screen();
    return {
      frame,
      cycles: module._dmg_cycles(),
      registers,
      // Flag bits of F: Z=7, N=6, H=5, C=4 (Pan Docs "CPU Registers and Flags").
      flags: { z: (f & 0x80) !== 0, n: (f & 0x40) !== 0, h: (f & 0x20) !== 0, c: (f & 0x10) !== 0 },
      changedMemory: changedRanges(module),
      screen: module.HEAPU8.slice(screenStart, screenStart + SCREEN_BYTES),
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
        frame++;
        flushAudio();
        frameState.offer(frame, snapshot);
      }
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
