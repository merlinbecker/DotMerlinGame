# Vertrag: Ports (M1)

Ort: `src/core/ports/`. Grundlage ist der M0-Vertrag (`specs/000-m0-scaffold/contracts/ports.md`).
Hier stehen nur die Änderungen und neuen Ports.

## EmulatorPort – Änderung gegenüber M0

```ts
export type BootMode = 'own-boot-rom' | 'direct-start';           // unverändert

export interface LoadRomOptions {                                   // unverändert
  readonly bootMode: BootMode;
  readonly hardwareChecks: boolean;
}

export interface EmulatorPort {
  /** Rejects with RomLoadError; on rejection the previous ROM/state stays untouched. */
  loadRom(rom: Uint8Array, options: LoadRomOptions): Promise<void>;
  run(): void;
  pause(): void;
  reset(): void;
  setButton(button: Button, pressed: boolean): void;

  /** NEW: battery-backed cartridge RAM; null if the cartridge has none. */
  readBatteryRam(): Uint8Array | null;
  /** NEW: call before run() after loadRom(); ignored if the cartridge has no battery. */
  writeBatteryRam(data: Uint8Array): void;
  /** NEW: true if cartridge RAM was written since the last readBatteryRam(). */
  readonly batteryRamDirty: boolean;

  /** NEW: samples go to this sink; null detaches audio (emulation continues). */
  setAudioSink(sink: AudioSink | null): void;

  // Declared in M0 for M4, not implemented in M1 (throw 'not supported in M1'):
  step(): void;
  setBreakpoint(address: number, bank?: number): void;
  clearBreakpoint(address: number, bank?: number): void;

  readonly frameState: FrameStatePublisher;
  readonly events: DomainEventSubscriber;
}

export type RomLoadErrorReason = 'invalid' | 'cgb-only' | 'unsupported-cartridge';
export class RomLoadError extends Error { readonly reason: RomLoadErrorReason }
```

Regeln:
- `loadRom` prüft den Header über `src/core/rom/header.ts`, bevor der Core etwas sieht.
- `hardwareChecks: true` → Halt bei falschem Logo-Hash oder falscher Checksumme, Ereignis `EmulatorHalted`
  ([events-and-frame-state.md](events-and-frame-state.md)). Mit eigener Boot-ROM erfolgt der Halt am
  Übergang nach `$0100`, beim Direktstart vor dem ersten Befehl.
- Beide Startmodi hinterlassen bei PC=`$0100` denselben internen Zustand (research.md R6).
- `step`/`*Breakpoint` bleiben im Port (M0-Vertrag), die Umsetzung kommt in M4 (Spec: „Port muss sie
  nur vorsehen“).

## AudioSink – neu

```ts
/** Receives interleaved stereo PCM from the emulator, one call per emulated frame. */
export interface AudioSink {
  readonly sampleRate: number;
  push(samples: Int16Array): void;
}
```

## AudioOutputPort – neu

```ts
export interface AudioOutputPort extends AudioSink {
  /** Must be called from a user gesture; resolves when the browser allows playback. */
  unlock(): Promise<void>;
  readonly unlocked: boolean;
  setVolume(volume: number): void;   // 0..1, takes effect immediately
  setMuted(muted: boolean): void;    // takes effect immediately, emulation unaffected
  /** Fill level of the playback buffer in samples; drives emulation pacing (research.md R8). */
  readonly bufferedSamples: number;
  suspend(): Promise<void>;    // pause / background, short fade-out to avoid clicks
  resume(): Promise<void>;     // short fade-in
}
```

Adapter: `src/adapters/audio/web-audio-output.ts` plus AudioWorklet-Prozessor. Kein `SharedArrayBuffer`.

## RomStorePort – neu

```ts
export interface StoredRom {
  readonly bytes: Uint8Array;
  readonly fileName: string;
  readonly loadedAt: string;          // ISO 8601
  readonly battery: Uint8Array | null;
}

/** Holds at most one ROM (FR-002). Separate from ProjectStorePort, which never stores ROMs. */
export interface RomStorePort {
  load(): Promise<StoredRom | null>;
  /** Replaces ROM and drops the old save game in one transaction. */
  replace(rom: Omit<StoredRom, 'battery'>): Promise<void>;
  saveBattery(data: Uint8Array): Promise<void>;
}
```

Fehler: `QuotaExceededError` wird als `StorageFailed` gemeldet. Der Aufrufer startet das ROM trotzdem
aus dem Speicher.

Adapter: `src/adapters/storage/indexeddb-rom-store.ts`. Vertragstest gegen eine In-Memory-Variante und
`fake-indexeddb` (devDependency, Lizenz vor Aufnahme prüfen).

## Unverändert

`AssemblerPort`, `ProjectStorePort`, `ArchivePort` (M2+).
