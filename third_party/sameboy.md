---
name: SameBoy Core
version: v1.0.4
license: MIT
licenseFile: licenses/sameboy-LICENSE
source: https://github.com/LIJI32/SameBoy
commit: 26a56bd6a122a6318a456abd80558408742d5adf
---

# SameBoy (Emulator-Core)

- **Quelle**: https://github.com/LIJI32/SameBoy
- **Version**: Release v1.0.4 (2026-10-09), Commit `26a56bd6a122a6318a456abd80558408742d5adf`
- **Lizenz**: Expat (SPDX: `MIT`), geprüft anhand der LICENSE-Datei des Commits. Die dort genannte
  Zusatzbedingung gilt nur für das Verzeichnis `iOS/`, das wir weder bauen noch ausliefern. Lizenztext:
  `licenses/sameboy-LICENSE`.
- **Übernommene Teile**: nur `Core/`, kompiliert werden `gb.c`, `sgb.c`, `apu.c`, `memory.c`, `mbc.c`,
  `timing.c`, `display.c`, `camera.c`, `sm83_cpu.c`, `joypad.c`, `save_state.c`, `random.c`, `rumble.c`,
  `printer.c`, `workboy.c` (mit den Headern aus `Core/`).
- **Nicht übernommen**: `BootROMs/` (eigene Boot-ROM, ADR-0004), `iOS/`, `HexFiend/`, alle Frontends,
  Debugger, Rewind und Cheats (per `GB_DISABLE_*` abgeschaltet).
- **Änderungen am Core**: keine. Eigener Code liegt nur im Wrapper
  `src/adapters/emulator/sameboy/wrapper.c` (MIT).
- **Ausgeliefert als**: `src/adapters/emulator/sameboy/generated/sameboy.wasm` + `sameboy.mjs`, gebaut von
  `scripts/build-core.sh` im Image `emscripten/emsdk@sha256:cdefec943f04fd4b2b2fe23b0a1a346be9fc560ef5784a83faa27dd351381372`.
  Herkunft und Prüfsummen: `generated/BUILD-INFO.json`. Bauweg: arc42 Kapitel 7.3.
- **Entscheidung**: ADR-0006.
