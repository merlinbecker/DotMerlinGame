# Vertrag: WASM-Schnittstelle, Ergänzungen für M1b

Basis: [../../001-m1-emulator-bootrom/contracts/wasm-abi.md](../../001-m1-emulator-bootrom/contracts/wasm-abi.md).
Neue Funktionen stehen in `wrapper.c` und in der Exportliste von `scripts/build-core.sh`. Danach wird das
Artefakt mit `npm run core:build` neu gebaut und committet; `core:verify` und der CI-Job
`core-reproducible` sichern den Nachbau.

## Neue Funktionen

| Funktion | Zweck | Quelle im Core |
|---|---|---|
| `const uint8_t *dmg_area(int area, size_t *size)` | Zeiger und Größe eines Bereichs: 0 ROM, 1 VRAM, 2 WRAM, 3 OAM, 4 HRAM, 5 Cartridge-RAM. Nur lesen, nie über den Zeiger schreiben | `GB_get_direct_access` |
| `void dmg_io(uint8_t out[128])` | Kopie von `io_registers`, `out[0x04]` = `div_counter >> 8` | `GB_DIRECT_ACCESS_IO`; `div_counter` (`GB_INTERNAL`) |
| `uint8_t dmg_ie(void)` | `$FFFF` | `GB_DIRECT_ACCESS_IE` |
| `void dmg_banks(uint16_t out[3])` | ROM-Bank, ROM0-Bank, gewählte Cartridge-RAM-Bank (roh) | `GB_get_direct_access(…, &bank)`; RAM-Bank aus `mbc_ram_bank` (`GB_INTERNAL`), weil direkter Zugriff sie mit einer Größe maskiert, die bei MBC2 0 ist |
| `int dmg_cart_ram_enabled(void)` | 1 freigegeben, 0 gesperrt, −1 Modul ohne MBC | `mbc_ram_enable`, `cartridge_type->mbc_type` (`GB_INTERNAL`) |
| `unsigned dmg_cpu_flags(void)` | Bit 0 IME, Bit 1 HALT | `ime`, `halted` (`GB_INTERNAL`) |

`dmg_rom_bank()` aus M1 bleibt (Tests). `dmg_peek` bleibt nur für Tests und M4, nicht für Views und nicht
mehr für `changedMemory` (research.md R2).

## Regeln

- **Keine Nebenwirkung**: Keine der neuen Funktionen ruft Lesefunktionen des Cores
  (`GB_read_memory`, `GB_safe_read_memory`) oder Syncs (`GB_display_sync`, `GB_apu_run`) auf.
- **Markierung**: Jeder Zugriff auf ein `GB_INTERNAL`-Feld bekommt einen Kommentar
  `/* GB_INTERNAL: … */` mit dem Grund, wie in M1.
- **Kopieren**: Der Adapter kopiert aus den Zeigern sofort (`HEAPU8.slice`). Kein TypeScript-Code außer
  dem Adapter sieht Heap-Zeiger.
- **Unveränderter Core**: Es gibt keinen Patch am SameBoy-Core, nur Wrapper-Code.
