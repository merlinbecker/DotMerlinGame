# ADR-0013: Eigener konservativer Disassembler

- **Status**: akzeptiert
- **Datum**: 2026-10-30
- **Meilenstein**: M3

## Kontext

M3 verlangt ROM → Quelltext → Build byte-identisch und Befehle nur dort, wo Code sicher erreichbar ist. Ungültige Header müssen
erhalten bleiben. Fremdcode unter GPL scheidet aus.

## Entscheidung

1. Eigener Disassembler als reiner Code in `src/core/disasm/`, Tabelle aus RGBDS `gbz80(7)` und Pan Docs. Ein Test baut jeden
   Opcode mit `rgbasm` und vergleicht die Bytes.
2. Nur statische Ziele, keine Heuristiken. Ziele im umschaltbaren Bereich gelten nur, wenn die Bank sicher ist.
3. `ProjectSettings.fixHeader = false` für importierte Projekte: `rgbfix` läuft dann nicht.
4. Jeder Import baut den Quelltext sofort und vergleicht ihn mit dem ROM. Das ROM wird nirgends aufbewahrt.

## Konsequenzen

- Bänke ohne gesicherten Zugang bleiben Daten, große ROMs sind daher anfangs wenig lesbar.
- Code hinter einem `call` kann Daten sein, wenn die Routine nicht zurückkehrt. Das stört nur die Lesbarkeit, nie die Byte-Treue.
- `rgblink` schreibt ganze Bänke: Andere Größen erhalten am Ende Füllbytes, das Ergebnis nennt die Anzahl.
- Exportierte `.gb` importierter Projekte haben den Header des Originals, auch einen ungültigen. Der Schalter in den Einstellungen
  ändert das.
- Ab etwa 4 MiB ROM überschreitet der Quelltext die ZIP-Grenze von 16 MiB beim Import.

## Alternativen

- **mgbdis oder andere Disassembler übernehmen**: nicht geprüft und nicht nötig; ein Port wäre Übernahme mit eigenem ADR.
- **Heuristiken für Sprungtabellen**: in der Spec ausgeschlossen, sie gefährden SC-002.
- **Header nachträglich patchen**: Das ROM wäre dann nicht mehr reines Ergebnis des Quelltexts.

## Bezüge

Constitution I, VI, X; ADR-0005, ADR-0011; `specs/003-m3-disassembler-roundtrip/research.md`.
