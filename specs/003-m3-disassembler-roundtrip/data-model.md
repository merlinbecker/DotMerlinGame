# Data Model: M3 – Disassembler und Roundtrip

## ProjectSettings (Erweiterung)

| Feld | Typ | Start | Regel |
|---|---|---|---|
| `fixHeader` | boolean | `true` | `false`: kein `rgbfix`. Im ZIP optional, fehlt es, gilt `true` |

## RomImportResult (nur im Speicher)

| Feld | Typ | Regel |
|---|---|---|
| `verdict` | `identical \| padded \| different \| not-verified` | R6 |
| `paddedBytes` | number | nur bei `padded` |
| `codeBytes`, `dataBytes` | number | für die Anzeige |

## Analysis (Ergebnis je ROM)

| Feld | Typ | Regel |
|---|---|---|
| `banks` | Anzahl | `ceil(size / $4000)`, mindestens 1 |
| `code` | Menge von `(bank, offset, Länge)` | Befehlsanfänge, keine Überlappung |
| `labels` | Menge von `(bank, Adresse)` | nur Befehlsanfänge oder Datenpositionen, nie mitten in einem Befehl |

## Erzeugtes Projekt

`main.asm` (Hinweise, Includes), `bank_000.asm` usw. `settings`: `entry: main.asm`, `title` aus dem Header (nur druckbar), `fixHeader: false`.
Kein ROM im Projekt (FR-008).
