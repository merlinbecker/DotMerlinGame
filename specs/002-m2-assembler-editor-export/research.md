# Research: M2 – Assembler, Editor, Export

Stand: 2026-10-30. Spikes liefen im Codespace außerhalb des Repos. Lizenzangaben stammen aus den
LICENSE-Dateien der genannten Stände.

## R1: RGBDS als WASM

**Decision**: RGBDS v1.0.4 (Commit `f7b8207`) wird selbst mit Emscripten gebaut: drei getrennte Module
`rgbasm`, `rgblink`, `rgbfix`. Das Image ist dasselbe wie beim Emulator-Core
(`emscripten/emsdk@sha256:cdefec94…`). `rgbgfx` wird nicht gebaut.

**Rationale**: Der Spike hat die ganze Kette mit `tests/roms/src/pattern.asm` durchlaufen:

| Prüfung | Ergebnis |
|---|---|
| Kompilieren ohne Quelltextänderung | erfolgreich |
| ROM aus WASM gegen natives RGBDS v1.0.4 | **SHA-256 identisch** (`6a069fc4…`) |
| Dauer der Kette unter Node im Codespace | etwa 300 ms |
| Größe WASM gzip | `rgbasm` 173 KB, `rgblink` 113 KB, `rgbfix` 71 KB |
| Fehler mit Include-Kette | `at b.inc(3)`, darunter `<- m.asm(1)` |

Flags des Spikes: `-O2 -std=c++20 -fno-exceptions -fno-rtti`, Linker `MODULARIZE`, `EXPORT_ES6`,
`FORCE_FILESYSTEM`, `INVOKE_RUN=0`, `EXIT_RUNTIME`, `ALLOW_MEMORY_GROWTH`, `FS` und `callMain` exportiert.

**Alternatives considered**:
- Fertiges Paket oder rgbds-live: `rgbds-live` ist laut GitHub-API MIT, bleibt aber nach ADR-0003 Referenz. Eine
  Übernahme bringt keinen Vorteil, weil der eigene Bau ohne Patch gelingt.
- Eigener Assembler: verworfen, das Briefing verlangt RGBDS.

## R2: Lizenz von RGBDS und erzeugtem Parser

**Decision**: Ausgeliefert werden darf auch der von Bison erzeugte Parser (Entscheidung des Projektinhabers,
2026-10-30). Das ADR zitiert die Ausnahme wörtlich.

**Rationale**:
- `LICENSE` von RGBDS ist MIT. Alle 92 Quelldateien außerhalb von `src/gfx` tragen `SPDX … MIT`.
- Die Treffer für „GPL“ in `src/gfx` und `man/rgbgfx.1` meinen das GIMP-Palettenformat.
- `parser.cpp` und `script.cpp` enthalten das GPL-Skelett von Bison 3.8.2 mit der „special exception“: Es darf
  in größeren Werken zu frei gewählten Bedingungen verteilt werden, solange das Werk kein Parser-Generator ist.
  Dieses Projekt ist keiner.
- Bison selbst ist Build-Werkzeug und wird nicht ausgeliefert.

**Belegt (T003)**: Der C++-Build linkt laut `-Wl,--trace` zusätzlich `libc++-noexcept`, `libc++abi-noexcept` und
`libclang_rt.builtins`. Alle drei stehen laut `LICENSE.TXT` im Image unter Apache-2.0 mit LLVM-Ausnahme. Text und
Nachweis stehen in `third_party/emscripten.md` und `third_party/licenses/emscripten-LICENSE`.

## R3: Reproduzierbarer Bau

**Decision**: `scripts/build-assembler.sh`, `npm run assembler:build`, `npm run assembler:verify` und ein CI-Job
wie beim Core. Artefakte und `BUILD-INFO.json` liegen in `src/adapters/assembler/rgbds/generated/`.

**Belegt (T001, T002)**: Das Image enthält kein Bison. Das Skript installiert im Container das Paket
`bison=2:3.8.2+dfsg-1build2` aus dem Ubuntu-24.04-Archiv und prüft die Version hart. Zwei Läufe waren byte-identisch.
Grenze: Der Bau braucht das Ubuntu-Archiv im Netz; verschwindet dieses Paket, schlägt der CI-Job sichtbar fehl.

## R4: Ausführung im Worker und Zeitgrenze

**Decision**: Die Kette läuft in einem Web Worker. Jedes Werkzeug bekommt eine frische Modulinstanz und ein eigenes
MEMFS. Der Hauptthread beendet den Worker nach **10 s** und meldet einen Abbruch (Spec-Edge-Case).

**Rationale**: Nur `terminate()` beendet eine Endlosschleife in `REPT` oder einem Makro sicher. `EXIT_RUNTIME` macht
die Instanzen ohnehin einmalig.

**Offline**: Der Service Worker bleibt bis M7 aus. Deshalb lädt die App beim Start den Worker und kompiliert alle
drei Module vor; außerdem liegt ein zweiter Worker bereit, der nach einem Abbruch übernimmt. Damit funktioniert der
Build, wenn das Netz nach dem Laden der Seite wegfällt. **Grenze**: Ein Kaltstart ohne Netz geht erst mit M7.
SC-005 ist für M2 in diesem Sinn zu lesen.

## R5: Meldungen auswerten

**Decision**: Aufruf mit `--color never`. Der Parser in `src/core/build/diagnostics.ts` liest `error:` und
`warning:` und ordnet die erste folgende Zeile `at datei(zeile)` zu. Die innerste Datei zählt, die `<-`-Zeilen sind
nur Kontext. Meldungen ohne Ort, etwa vom Linker, haben `file: null`. Deshalb wird `Diagnostic` nullable.

**Belegt (T009)**: Alle drei Werkzeuge kennen `--color never`. Makros erscheinen als `at datei::m(2)`, `REPT` als
`at datei::REPT~1(3)`, jeweils mit der Zeile in der Datei. Dazu kommen `FATAL:` und mehrzeilige Listen. Echte Ausgaben
liegen in `tests/assembler/fixtures/`.

## R6: Editor

**Decision**: CodeMirror 6 (Entscheidung des Projektinhabers, 2026-10-30): `@codemirror/state` 6.7.6,
`@codemirror/view` 6.43.15, `@codemirror/commands` 6.11.1 mit ihren Abhängigkeiten. Die LICENSE-Dateien der Pakete
`state`, `view`, `commands`, `style-mod`, `w3c-keyname`, `crelt` und `@marijn/find-cluster-break` wurden geprüft und
sind MIT. `@lezer/*` kommt über `commands` mit und wird beim Einbinden ebenfalls geprüft.

**Rationale**:
- Spike-Bundle: 277 KB, davon 91 KB gzip.
- `drawSelection({ cursorBlinkRate: 0 })` ist in den Typen dokumentiert und schaltet das Blinken ab.
- Die Android-Texteingabe muss nicht selbst gebaut werden.

Die Hervorhebung ist ein eigener zeilenweiser Tokenizer (`src/core/build/highlight.ts`) und läuft über Dekorationen.
Blättern ist eigener Code: `overflow: hidden` am Scroller, Seitenwechsel per Pager, `lineWrapping` statt seitlichem
Scrollen. Stile liegen in CSS-Modulen mit Tokens, nicht in `EditorView.theme`.

**Offen**: Blättern, Bildschirmtastatur und Neuzeichnen auf dem Palma sind nicht geprüft. Das ist Gerätetest in M2.

**Alternatives considered**: Eigener Editor ohne Abhängigkeit, verworfen wegen Aufwand und Risiko bei der
Android-Eingabe.

## R7: ZIP

**Decision**: `fflate` 0.8.3 (LICENSE geprüft: MIT), beim Import nur im Streaming-Modus mit eigenem Bytezähler.

**Rationale**: Im Spike wurde die Größenangabe eines 50-MB-Eintrags im ZIP auf 10 Byte gefälscht. `fflate` meldete
10, lieferte aber 50 MB aus. Der Angabe im Archiv darf man also nicht trauen. Der Zähler bricht ab, sobald die
Grenze überschritten ist.

**Grenzen (Startwerte)**: höchstens 1000 Einträge, 16 MiB entpackt, 16 MiB Archiv. Abgelehnt werden `..`, führende
`/`, `\`, Laufwerksangaben, NUL und doppelte Pfade.

## R8: Lauf eines Builds und gespeichertes ROM

**Decision**: Ein gebautes ROM läuft über `RunBuild`, wird nie in `RomStore` geschrieben und zeigt keinen
Ersetzen-Dialog. Spielstände werden für Build-Läufe in M2 nicht gespeichert.

**Rationale**: Constitution I und FR-005. Der M1-Pfad `saveBattery` schreibt in den Datensatz des gespeicherten
ROMs. Ohne Trennung würde ein Build-Lauf den Spielstand eines fremden ROMs überschreiben. Die Session merkt sich
deshalb die Quelle des Laufs (`stored` oder `build`).

## R9: Speicher

**Decision**: Eigene Datenbank in IndexedDB für Projekte; Name aus `PROJECT_NAME`. Die Reopen-Logik aus 0.3.16 wird
zu einem gemeinsamen Helfer. Autosave 1 s nach der letzten Änderung und sofort bei `visibilitychange` und `pagehide`.
Der Editortext liegt im Projektzustand der App, damit er einen Wechsel des View-Inhalts überlebt.

## R10: Beispielprojekt und Hardware-Konstanten

**Decision**: `examples/hello/` nutzt eigene, minimale Konstanten mit Pan-Docs-Quellenangabe, wie die Test-ROMs.

**Rationale**: `hardware.inc` ist laut LICENSE CC0 und wäre erlaubt, aber ein Beispiel braucht nur wenige Werte und
damit keinen neuen Eintrag in `third_party/`.

## Offene Punkte

1. ~~Gelinkte Laufzeiten des C++-Baus und ihre Lizenzen (R2).~~ Belegt (T003).
2. ~~Bison 3.8.2 im festgelegten Bauweg (R3).~~ Belegt (T001).
3. ~~Meldungsformat bei Makros, `--color` bei `rgblink` und `rgbfix` (R5).~~ Belegt (T009).
4. Build-Dauer auf dem Mittelklasse-Smartphone (SC-003), bisher nur Node im Codespace gemessen.
5. Editor auf E-Ink: Blättern, Tastatur, Neuzeichnen (R6).
6. Kaltstart ohne Netz erst ab M7 (R4). Der Projektinhaber sollte das bei der Abnahme von SC-005 kennen.
