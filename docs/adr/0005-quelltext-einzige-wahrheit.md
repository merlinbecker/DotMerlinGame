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

## Nachtrag M1 (2026-10-18)

- In M1 hält die App genau **ein** geladenes ROM samt Spielstand (batteriegepuffertes Cartridge-RAM) als
  Laufzeit-Eingabe. Es liegt im eigenen `RomStorePort` (IndexedDB), nie im Projektspeicher.
  `ProjectStorePort` bleibt ROM-frei.
- Ein neu geladenes ROM ersetzt das gespeicherte, der alte Spielstand wird dabei gelöscht. Die ROM-Datei
  selbst bleibt auf dem Gerät.
- Ab M3 werden importierte ROMs disassembliert, dann entfällt diese Übergangslösung.

## Nachtrag M3 (2026-10-30)

- Der Import aus M3 macht aus einem ROM ein Projekt (ADR-0013). Das ist ab jetzt der Weg, an einem fremden ROM zu arbeiten.
- **Load ROM** in ROM Info bleibt vorerst bestehen und widerspricht damit dem Satz „dann entfällt diese Übergangslösung“.
  Es dient nur zum Spielen und Ansehen, der Projektspeicher bleibt ROM-frei. Der Projektinhaber hat mehrfach gefragt, ob
  das Laden erhalten bleibt, das Entfernen ist nicht Teil der Spec von M3. **Die endgültige Entscheidung steht aus.**

## Konsequenzen

Der Disassembler muss byte-identische Roundtrips liefern (M3). Der Debugger arbeitet auf Quelltextzeilen (M4).

## Alternativen

ROMs als bearbeitbare Artefakte (widerspricht dem Leitprinzip).

## Bezüge

Briefing Abschnitt 3; Constitution I; `contracts/ports.md`.
