# ADR-0006: Emulator-Core-Auswahl

- **Status**: akzeptiert
- **Datum**: 2026-10-18
- **Meilenstein**: M1

## Kontext

M1 braucht einen DMG-01-Emulator als Headless Service im Browser (Constitution II), inklusive Ton, der
Cartridge-Typen ROM ohne MBC, MBC1, MBC3 und MBC5 sowie batteriegepuffertem RAM. Er muss die eigene
Boot-ROM ausführen (ADR-0004) und einen Direktstart erlauben, der exakt denselben Zustand erzeugt.
Erlaubt sind nur permissive Lizenzen (Constitution VI). FR-014 verlangt einen Vergleich der Debug-Hooks.

Die Entscheidung beruht auf einem Spike vom 2026-10-18. Beide Kandidaten wurden aus festen Commits mit
Emscripten 6.0.11 nach WASM gebaut und in Node mit einem selbst erzeugten Test-ROM ausgeführt (600 Frames).
Die Lizenzen stammen aus den LICENSE-Dateien der Repos.

## Entscheidung

1. **Core: SameBoy**, nur `Core/`, Commit `26a56bd6a122a6318a456abd80558408742d5adf` (Release v1.0.4),
   Modell `GB_MODEL_DMG_B`. Gebaut ohne Debugger, Rewind und Cheats. `BootROMs/`, `iOS/`, `HexFiend/`
   und Frontends werden weder gebaut noch ausgeliefert.
2. **Anbindung**: eigener C-Wrapper `src/adapters/emulator/sameboy/wrapper.c`
   (Schnittstelle: `specs/001-m1-emulator-bootrom/contracts/wasm-abi.md`) und der TypeScript-Adapter
   `sameboy-emulator.ts` hinter `EmulatorPort`. Am Core selbst wird nichts geändert.
3. **Bauweg „Artefakt + Prüf-Build“** (Entscheidung des Projektinhabers):
   - `scripts/build-core.sh` klont SameBoy zum festen Commit nach `.build/sameboy` und kompiliert im Image
     `emscripten/emsdk@sha256:cdefec943f04fd4b2b2fe23b0a1a346be9fc560ef5784a83faa27dd351381372`
     (Tag 6.0.11) mit festen Pfaden.
   - Ausgabe `generated/sameboy.mjs`, `generated/sameboy.wasm` und `BUILD-INFO.json` (Commit, Image, Flags,
     SHA-256). Sie wird committet.
   - Der CI-Job `core-reproducible` (lokal `npm run core:verify`) baut neu und schlägt bei jeder
     Abweichung fehl. `npm run check` enthält diesen Docker-Schritt nicht.
4. **Lizenzen**:
   - SameBoy steht unter Expat (SPDX `MIT`). Die Zusatzbedingung betrifft nur `iOS/`.
   - Die gelinkte Emscripten-Laufzeit, laut Link-Trace `libc.a`, `libdlmalloc.a` und `libstubs.a`:
     Emscripten MIT/NCSA (wir nutzen MIT), musl MIT, dlmalloc CC0.
   - Einträge stehen in `third_party/sameboy.md`, `third_party/emscripten.md` und `THIRD_PARTY_LICENSES`.
     Die Lizenztexte werden mit der App ausgeliefert (`dist/THIRD_PARTY_LICENSES`).
5. **Determinismus**: `GB_random_seed` mit fester Konstante vor jedem Start, damit Tests und der Vergleich
   der Startmodi reproduzierbar sind.

## Vergleich (Spike)

| Kriterium | SameBoy (ohne Debugger) | SameBoy (mit Debugger) | binjgb `1662111` |
|---|---|---|---|
| Lizenz (LICENSE-Datei) | Expat, außer `iOS/`, `HexFiend/` | dto. | MIT |
| Kompiliert mit Emscripten 6.0.11 | ja | ja (dann mit Rewind und Cheats) | ja |
| `.wasm` gzip | 72 KB | 99 KB | 32 KB |
| ms pro Frame (Node, Codespace) | 0,88 | 1,06 | 0,38 |
| Boot-ROM bis `$FF50` einblenden | nativ, mit eigenem Stub belegt | nativ | fehlt (Core-Patch nötig) |
| Echter Einschaltzustand vor der Boot-ROM | ja | ja | nein, startet im Zustand nach dem Boot |
| Direktstart | eigene Wrapper-Funktion (belegt) | dto. | nativ |
| Schreib-Hook (`changedMemory`) | `GB_set_write_memory_callback` (belegt) | dto. | nein |
| Lese-Hook (Watchpoints, M4) | `GB_set_read_memory_callback` (belegt) | dto. | nein |
| Ausführungs-Hook (Breakpoints/Step, M4) | `GB_set_execution_callback` (belegt) | dto., plus befehlsbasierter Debugger | eingebaute Breakpoints mit Bank, `emulator_step` |
| Ton, Kanal stumm | ja | ja | ja |
| ROM-Bank abfragen | ja | ja | ja |
| Batterie-RAM | ja | ja | ja |
| Determinismus mit festem Seed | belegt | belegt | nicht geprüft |
| Letzter Commit | 2026-10-13 | | 2026-09-25 |

Gemessene Hooks im Build ohne Debugger (60 Frames): 117.043 Schreib-, 351.123 Ausführungs- und 819.282
Lese-Callbacks. Zwei Builds mit leerem Cache waren byte-identisch.

## Konsequenzen

- Positiv: SameBoy führt immer echte Boot-ROMs aus und bildet den Einschaltzustand nach. Unsere Boot-ROM
  läuft ohne Core-Patch. Die Hooks reichen für M4 (Breakpoints, Step, Watchpoints), ohne SameBoys
  Debugger einzubinden.
- Negativ: Der WASM-Wrapper ist eigener Pflegeaufwand. Das Artefakt ist größer als bei binjgb (72 KB gzip).
  Für den Direktstart greift der Wrapper auf SameBoy-Interna (`GB_INTERNAL`) zu. Tests fangen Änderungen
  bei einem Core-Update ab.
- Ein Core-Update geht nur bewusst: Commit in `scripts/build-core.sh` ändern, `npm run core:build`,
  `third_party/sameboy.md` anpassen, alles in einem Commit (Ablauf in arc42 Kapitel 7.3).
- Die Zeit pro Frame muss auf dem Zielgerät gemessen werden (SC-003). Ein Wechsel in einen Web Worker
  bliebe lokal im Adapter.

## Alternativen

- **binjgb** (MIT): kleiner und schneller, Wrapper vorhanden. Verworfen, weil die eigene Boot-ROM einen
  ungetesteten Core-Patch für Boot-ROM-Mapping **und** Einschaltwerte von CPU, PPU, APU und Timer erfordert
  hätte, und weil der Schreib-Hook fehlt.
- **wasmboy**: GPL-3.0 laut GitHub, ausgeschlossen.
- **mGBA**: MPL-2.0 (schwaches Copyleft), nicht in der Freigabeliste.
- **Gambatte**: GPL, laut Briefing ausgeschlossen.
- **Eigener Core**: Aufwand außerhalb von M1.
- **Vorgebautes `binjgb.wasm`**: Commit und Flags unbekannt, Herkunft nicht prüfbar.

## Bezüge

Briefing Abschnitt 5 und 8 (M1); Constitution II, III, VI, VII, X;
`specs/001-m1-emulator-bootrom/research.md` R1–R3, R7; `third_party/sameboy.md`,
`third_party/emscripten.md`; arc42 Kapitel 7.3 und 8.8; ADR-0003, ADR-0004.
