# ADR-0011: RGBDS als selbst gebautes WASM und erzeugter Bison-Parser

- **Status**: akzeptiert
- **Datum**: 2026-10-30
- **Meilenstein**: M2

## Kontext

M2 verlangt `rgbasm`, `rgblink` und `rgbfix` lokal im Browser (FR-002), wenn das lizenz- und bautechnisch sauber
möglich ist (Briefing). FR-011 verlangt ein ADR zum Weg. Die Projektregel lautet: kein GPL-Code, im Zweifel fragen.

RGBDS steht laut `LICENSE` unter MIT. Beim Bau erzeugt Bison aber `src/asm/parser.cpp` und `src/link/script.cpp`.
Diese Dateien enthalten das GPL-Skelett von Bison mit einer Ausnahme.

## Entscheidung

1. RGBDS v1.0.4 (Commit `f7b8207`) wird ohne Patch mit dem festgelegten emsdk-Image selbst gebaut:
   `scripts/build-assembler.sh`, Prüfung per `npm run assembler:verify` und CI-Job `assembler-reproducible`.
2. `rgbgfx` wird nicht gebaut.
3. Der von Bison erzeugte Parser darf ausgeliefert werden (Entscheidung des Projektinhabers, 2026-10-30). Das ist
   keine allgemeine Öffnung für GPL-Code. Sie gilt nur für diese Ausgabe mit dieser Ausnahme. Bison selbst wird nicht
   ausgeliefert.

Wortlaut der Ausnahme aus dem erzeugten `parser.cpp` (Bison 3.8.2):

> As a special exception, you may create a larger work that contains part or all of the Bison parser skeleton and
> distribute that work under terms of your choice, so long as that work isn't itself a parser generator using the
> skeleton or a modified version thereof as a parser skeleton. Alternatively, if you modify or redistribute the parser
> skeleton itself, you may (at your option) remove this special exception, which will cause the skeleton and the
> resulting Bison output files to be licensed under the GNU General Public License without this special exception.

Dieses Projekt ist kein Parser-Generator. Die Einschätzung ist kein Rechtsrat.

## Konsequenzen

- Die Kette ergibt byte-identische ROMs zum nativen RGBDS (research.md R1) und läuft ohne Netzwerk.
- Etwa 355 KB WASM (gzip) kommen dazu.
- Das WASM linkt zusätzlich libc++, libc++abi und compiler-rt (Apache-2.0 mit LLVM-Ausnahme), siehe
  `third_party/emscripten.md`.
- Der Nachbau braucht Docker und das Ubuntu-Paket `bison=2:3.8.2+dfsg-1build2`. Verschwindet es, schlägt die CI sichtbar
  fehl und das ADR ist anzupassen.
- Ein Update von RGBDS heißt: Commit und Artefakt neu festlegen, Roundtrip-Tests erneut laufen lassen.

## Alternativen

- **rgbds-live übernehmen**: laut GitHub MIT, aber Vorlage statt Fundament (ADR-0003). Der eigene Bau gelingt ohne Patch.
- **Eigener Assembler**: würde die GPL-Frage umgehen, widerspricht aber dem Briefing und wäre sehr aufwendig.
- **Assemblieren auf einem Server**: Kein Backend (ADR-0010).

## Bezüge

Briefing Abschnitte 3 und 8; Constitution VI, IX, X; ADR-0003, ADR-0005, ADR-0010;
`specs/002-m2-assembler-editor-export/research.md` R1–R3; `third_party/rgbds.md`.
