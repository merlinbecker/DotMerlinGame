# ADR-0005: Quelltext als einzige Wahrheit

- **Status**: akzeptiert
- **Datum**: 2026-10-18
- **Meilenstein**: M0

## Kontext

Die IDE soll Lernen, Debuggen und Export konsistent machen. Würde man ROMs direkt bearbeiten, liefen Quelltext und Binärdatei auseinander.

## Entscheidung

- Fremde ROMs werden beim Import einmalig disassembliert (ab M3); danach wird nur am Quelltext gearbeitet.
- Jeder Lauf ist Assemblieren → Emulieren. Ein ROM ist nur Build-Ergebnis (`BuildResult.rom`), Projekte speichern keine ROMs.
- Jeder Build liefert Symbol- und Map-Datei.
- **Übergang in M1**: Solange Assembler (M2) und Disassembler (M3) fehlen, führt M1 geladene ROMs direkt aus. Diese ROMs sind Laufzeit-Eingaben, keine Projektbestandteile.

## Konsequenzen

Der Disassembler muss byte-identische Roundtrips liefern (M3). Der Debugger arbeitet auf Quelltextzeilen (M4).

## Alternativen

ROMs als bearbeitbare Artefakte (widerspricht dem Leitprinzip).

## Bezüge

Briefing Abschnitt 3; Constitution I; `contracts/ports.md`.
