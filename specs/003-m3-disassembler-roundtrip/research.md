# Research: M3 – Disassembler und Roundtrip

Stand: 2026-10-30. Spikes mit RGBDS v1.0.4, nativ und als WASM aus M2.

## R1: Byte-Identität und `rgbfix`

**Decision**: `ProjectSettings` erhält `fixHeader: boolean` (Start `true`, importierte Projekte `false`). Mit `false`
entfällt `rgbfix`.

**Rationale**: `rgbfix -v` würde Logo und Prüfsummen korrigieren und damit ROMs mit ungültigem Header verändern. Der Header
liegt beim Import als Bytes im Quelltext, also bleibt er auch ohne `rgbfix` vollständig.

**Alternatives considered**: Nachträgliches Zurückschreiben der Bytes, verworfen: Das ROM wäre dann nicht mehr reines
Ergebnis des Quelltexts.

## R2: Befehlsformen

**Decision**: Eine Tabelle aller Opcodes in `src/core/disasm/opcodes.ts`, belegt aus RGBDS `gbz80(7)`, Pan Docs für die
Lücken im Befehlssatz. Ein Test assembliert **jeden** Opcode mit dem echten `rgbasm` und vergleicht die Bytes (FR-011).

**Rationale**: Der Spike zeigt, dass `rgbasm` die Formen nicht umschreibt: `ld [$FF12],a` bleibt `EA 12 FF`, `ldh` bleibt
`E0`, `halt` bleibt `76`, `stop` wird `10 00`. Ein `10` mit anderem zweitem Byte ist daher nur als Daten darstellbar.

## R3: Analyse

**Decision**: Rein statische Worklist, je Bank.

- Start: `$0100` sowie Reset- und Interrupt-Vektoren. Vektoren werden übersprungen, wenn ihr erstes Byte `$00` oder `$FF` ist,
  denn das sind meist Füllbytes.
- Es folgt `jp`, `jr`, `call` und `rst` mit festem Ziel. `ret`, `reti`, `jp hl` und unbedingte Sprünge beenden den Pfad.
- **Bänke**: Ziele in `$0000–$3FFF` gelten immer. Ziele in `$4000–$7FFF` gelten nur innerhalb derselben Bank oder bei einem
  ROM mit höchstens zwei Bänken. Aus ROM0 in den gewechselten Bereich ist das Ziel unbekannt, ein Label entfällt. Bänke ohne
  gesicherten Zugang bleiben Daten.
- **Abbruch**: ungültiger Opcode, `$10` ohne `$00`, Befehl über die Bankgrenze, Header `$0104–$014F`, Überlappung mit bereits
  erkanntem Code, und Füllbereiche ab 16 gleichen Bytes `$00` oder `$FF`.

**Grenze**: Auf einen `call` mit Daten direkt dahinter kann Code folgen, der keiner ist. Das ist am Byte-Ergebnis unschädlich,
kann aber die Lesbarkeit stören. SC-002 gilt für die eigenen Test-ROMs.

## R4: Ausgabe

**Decision**: `main.asm` bindet je Bank eine Datei `bank_000.asm` ein. Daten als `db` mit 16 Bytes je Zeile, Läufe ab 32 gleichen
Bytes als `ds`. Labels `L00_0150`. Ein Ziel mitten in einem Befehl behält die Zahl statt eines Labels.

**Rationale**: Eine Bank umfasst etwa 70 KB Text, das bleibt im Editor handhabbar. Der Spike baut 1 MiB in etwa 0,7 s unter Node
mit WASM (`rgbasm` 544 ms, `rgblink` 176 ms). `rgblink` füllt `ds`-freie Lücken selbst, die Ausgabe deckt aber jede Bank vollständig ab.

## R5: Ungewöhnliche Größen

**Decision**: `rgblink` schreibt immer ganze Bänke zu 16 KiB (Spike: 100 Byte werden zu 16384). ROMs, deren Größe kein Vielfaches
von 16 KiB ist, werden trotzdem importiert. Quelltext und Prüfergebnis nennen die zugefügten Bytes. Sie zählen nicht als
Roundtrip-Fehler, gehören aber auch nicht zum Test-Set. Eine leere Datei wird abgelehnt.

## R6: Prüfung beim Import

**Decision**: Nach dem Erzeugen baut der Import den Quelltext und vergleicht ihn mit dem ROM. Das Ergebnis steht im Project-View
(`identical`, `padded`, `different`, `not-verified`). Das Projekt wird in jedem Fall angelegt, das ROM nicht aufbewahrt.

**Rationale**: FR-005 wird so bei jedem echten ROM geprüft, nicht nur im Test-Set.

**Grenze**: Die Zeitgrenze des Builds aus M2 (10 s) kann auf schwachen Geräten bei sehr großen ROMs greifen. Dann lautet das Ergebnis
`not-verified`. Die ZIP-Grenze von 16 MiB entpackt betrifft ROMs ab etwa 4 MiB, weil ihr Quelltext dann größer ist.

## R7: Ausführung

**Decision**: Reine Funktion in `src/core/disasm/`, im Hauptthread, mit einer Pause je Bank und Fortschritt als Text.

**Rationale**: Ohne Service Worker kann ein später gestarteter Worker offline nicht laden. Die Analyse braucht wenig Zeit je Bank.
Die Bedienbarkeit misst ein E2E-Test.

## R8: Direktes Laden von ROMs bleibt

**Decision**: **Load ROM** in ROM Info bleibt vorerst unverändert. ADR-0005 sagt, dass die Übergangslösung ab M3 entfällt. Der Projektinhaber
hat aber mehrfach nachgefragt, ob ROMs weiter geladen und angesehen werden können. Entfernen wäre schwer umkehrbar und ist nicht Teil
dieser Spec. Das ADR bekommt einen Nachtrag mit diesem Stand; **die endgültige Entscheidung liegt beim Projektinhaber**.

## R9: Lokaler Lauf und Schutz

**Decision**: `npm run roundtrip:local` prüft alle ROMs in `roms/local/`. `roms/` ist schon ignoriert (Test belegt). Der Lauf schreibt keine
Dateien und zeigt nur Hash und Ergebnis. Zusätzlich werden `*.disasm/` und `roms/` im Gitignore-Test geprüft (SC-005).

## Offene Punkte

1. Laufzeit auf dem Smartphone (SC-003, SC-004), bisher nur unter Node.
2. Dauerhafter Umgang mit **Load ROM** (R8).
3. Freie Homebrew-ROMs im Test-Set: keine aufgenommen. Das Test-Set besteht aus den eigenen ROMs; fremde bräuchten je ein ADR.
