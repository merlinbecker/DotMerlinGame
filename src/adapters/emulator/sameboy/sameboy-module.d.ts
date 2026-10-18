/** Types of the Emscripten module built by scripts/build-core.sh (contracts/wasm-abi.md). */
declare module '*/generated/sameboy.mjs' {
  export interface SameBoyModule {
    readonly HEAPU8: Uint8Array;
    readonly HEAP16: Int16Array;
    readonly HEAPU16: Uint16Array;
    _malloc(size: number): number;
    _free(pointer: number): void;
    _dmg_init(sampleRate: number): number;
    _dmg_set_sample_rate(sampleRate: number): void;
    _dmg_load_rom(pointer: number, size: number): number;
    _dmg_load_boot_rom(pointer: number, size: number): number;
    _dmg_capture_handoff(): number;
    _dmg_reset(directStart: number): number;
    _dmg_set_halt_at_handoff(on: number): void;
    _dmg_run_frame(): number;
    _dmg_halt(): void;
    _dmg_set_keys(mask: number): void;
    _dmg_screen(): number;
    _dmg_audio(): number;
    _dmg_audio_count(): number;
    _dmg_audio_clear(): void;
    _dmg_cycles(): number;
    _dmg_registers(pointer: number): void;
    _dmg_peek(address: number): number;
    _dmg_dirty_pages(): number;
    _dmg_dirty_clear(): void;
    _dmg_battery_size(): number;
    _dmg_battery_save(pointer: number, size: number): number;
    _dmg_battery_load(pointer: number, size: number): void;
    _dmg_battery_dirty(): number;
    _dmg_rom_bank(): number;
  }
  const createSameBoy: () => Promise<SameBoyModule>;
  export default createSameBoy;
}
