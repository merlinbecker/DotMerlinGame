# Vertrag: WASM-Schnittstelle des SameBoy-Wrappers

> Ergänzt in M1b um Lesefunktionen für die Speicher-Ansichten:
> [../../004-m1b-memory-views/contracts/wasm-abi.md](../../004-m1b-memory-views/contracts/wasm-abi.md).

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
| `int dmg_capture_handoff(void)` | einmalig: eigene Boot-ROM mit neutralem Modul (32 KiB Nullen) bis zur Übergabe laufen lassen, Zustand als Save-State sichern (ADR-0004). Lädt danach das neutrale Modul, also vor dem Spiel aufrufen |
| `int dmg_reset(int direct_start)` | Reset. Bei `direct_start = 1` den Übergabe-Snapshot laden und F nach `$014D` setzen (research.md R6). Rückgabe 0 = ok |
| `int dmg_run_frame(void)` | bis zum nächsten VBlank oder Halt laufen. Rückgabe: 0 = Frame fertig, 1 = an `$0100` angekommen (für „Hardware-nah“), 2 = Fehler |
| `void dmg_halt(void)` | anhalten (Hardware-nah-Fehler); `dmg_run_frame` liefert dann 2 |
| `void dmg_set_sample_rate(unsigned rate)` | Sample-Rate der Tonausgabe |
| `void dmg_set_halt_at_handoff(int on)` | mit „Hardware-nah“: vor dem ersten Befehl ab `$0100` anhalten |
| `void dmg_set_keys(unsigned mask)` | Bitmaske der acht Tasten |
| `uint8_t *dmg_screen(void)` | 160 × 144 Graustufen-Indizes |
| `int16_t *dmg_audio(void)` / `unsigned dmg_audio_count(void)` / `void dmg_audio_clear(void)` | Stereo-Samples des letzten Frames |
| `void dmg_registers(uint16_t out[6])` | AF, BC, DE, HL, SP, PC |
| `double dmg_cycles(void)` | Zyklen seit Reset |
| `uint8_t dmg_peek(uint16_t addr)` | Lesen ohne Seiteneffekte (`GB_safe_read_memory`) |
| `const uint8_t *dmg_dirty_pages(void)` / `void dmg_dirty_clear(void)` | 128 Seiten à 256 Byte für `$8000–$FFFF` |
| `int dmg_battery_size(void)`, `int dmg_battery_save(uint8_t*, size_t)`, `void dmg_battery_load(const uint8_t*, size_t)`, `int dmg_battery_dirty(void)` | Spielstand |
| `unsigned dmg_rom_bank(void)` | aktuell eingeblendete ROM-Bank (für Tests, Debug in M4) |

Regeln:
- Deterministisch: gleicher Seed, gleiche Eingaben und gleiches ROM ergeben gleiche Ausgabe (Test).
- Kein Dateisystem (`FILESYSTEM=0`), keine Ausgabe auf stdout/stderr (Log-Callback verwirft).
- `GB_INTERNAL` wird nur im Wrapper genutzt, um den Übergabepunkt zu erkennen (`boot_rom_finished`). Dazu
  steht ein Kommentar an jeder Stelle.
- Der Vergleich der Startmodi läuft über Register, `dmg_peek` auf `$8000–$FFFF` und die Ausgabe danach
  (`tests/boot-state/handoff-equivalence.test.ts`, `tests/emulator/modes-identical.test.ts`).
