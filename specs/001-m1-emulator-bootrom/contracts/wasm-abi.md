# Vertrag: WASM-Schnittstelle des SameBoy-Wrappers

Ort: `src/adapters/emulator/sameboy/wrapper.c` (eigener Code, MIT). Einziger Aufrufer ist
`src/adapters/emulator/sameboy/sameboy-emulator.ts`. Kein anderer Code greift auf das WASM-Modul zu
(ESLint-Regel: Import von `generated/` nur aus diesem Adapter).

Alle Funktionen sind `EMSCRIPTEN_KEEPALIVE` und stehen in der Exportliste in `scripts/build-core.sh`.
Zeiger sind Offsets in `HEAPU8`.

| Funktion | Zweck |
|---|---|
| `int dmg_init(unsigned sample_rate)` | `GB_random_seed(SEED)`, `GB_init(GB_MODEL_DMG_B)`, Callbacks setzen (RGB-Encoder → Graustufen-Index, VBlank, Samples, Schreib-Hook) |
| `int dmg_load_rom(const uint8_t *rom, size_t size)` | ROM übernehmen (Kopie im Core) |
| `int dmg_load_boot_rom(const uint8_t *boot, size_t size)` | eigene Boot-ROM (256 Byte) |
| `void dmg_reset(int direct_start)` | Reset. Bei `direct_start = 1` Zustand am Übergabepunkt direkt setzen (research.md R6) |
| `int dmg_run_frame(void)` | bis zum nächsten VBlank oder Halt laufen. Rückgabe: 0 = Frame fertig, 1 = an `$0100` angekommen (für „Hardware-nah“), 2 = Fehler |
| `void dmg_set_halt_at_handoff(int on)` | mit „Hardware-nah“: vor dem ersten Befehl ab `$0100` anhalten |
| `void dmg_set_keys(unsigned mask)` | Bitmaske der acht Tasten |
| `uint8_t *dmg_screen(void)` | 160 × 144 Graustufen-Indizes |
| `int16_t *dmg_audio(void)` / `unsigned dmg_audio_count(void)` / `void dmg_audio_clear(void)` | Stereo-Samples des letzten Frames |
| `void dmg_registers(uint16_t out[6])` | AF, BC, DE, HL, SP, PC |
| `uint64_t dmg_cycles(void)` | Zyklen seit Reset |
| `uint8_t dmg_peek(uint16_t addr)` | Lesen ohne Seiteneffekte (`GB_safe_read_memory`) |
| `const uint8_t *dmg_dirty_pages(void)` / `void dmg_dirty_clear(void)` | 128 Seiten à 256 Byte für `$8000–$FFFF` |
| `int dmg_battery_size(void)`, `int dmg_battery_save(uint8_t*, size_t)`, `void dmg_battery_load(const uint8_t*, size_t)`, `int dmg_battery_dirty(void)` | Spielstand |
| `unsigned dmg_rom_bank(void)` | aktuell eingeblendete ROM-Bank (für Tests, Debug in M4) |
| `int dmg_handoff_state(uint8_t *out, size_t size)` | **nur Tests**: vollständiger interner Zustand am Übergabepunkt (Register, I/O, Teiler, PPU-Position, APU, VRAM, WRAM, HRAM, OAM) für den Vergleich der Modi |

Regeln:
- Deterministisch: gleicher Seed, gleiche Eingaben und gleiches ROM ergeben gleiche Ausgabe (Test).
- Kein Dateisystem (`FILESYSTEM=0`), keine Ausgabe auf stdout/stderr (Log-Callback verwirft).
- `GB_INTERNAL` wird nur im Wrapper für den Direktstart und den Übergabezustand genutzt. Dazu steht ein
  Kommentar an jeder Stelle.
