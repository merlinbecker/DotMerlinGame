# Data Model: M2 – Assembler, Editor, Export

## Projekt (persistiert, einzige Wahrheit)

| Feld | Typ | Regel |
|---|---|---|
| `id` | string | zufällig, neu beim Import als Kopie |
| `name` | string | nicht leer, höchstens 64 Zeichen |
| `settings` | `ProjectSettings` | siehe unten |
| `files` | `SourceFile[]` | mindestens eine Datei, Pfade eindeutig |
| `updatedAt` | ISO 8601 | beim Speichern gesetzt |

Ein Projekt enthält nie ein ROM (Constitution I).

## ProjectSettings

| Feld | Typ | Start | Bedeutung |
|---|---|---|---|
| `entry` | string | `main.asm` | Datei, die `rgbasm` übersetzt; muss in `files` liegen |
| `title` | string | Projektname, gekürzt | Titel für `rgbfix`, Grenzen laut RGBDS-Doku |
| `mbc` | string | `ROM_ONLY` | `rgbfix -m`; Werte laut RGBDS-Doku |
| `ramSize` | number | 0 | `rgbfix -r` |

## SourceFile

| Feld | Typ | Regel |
|---|---|---|
| `path` | string | relativ, `/` als Trenner, Regeln wie beim ZIP-Import (research.md R7) |
| `content` | `Uint8Array` | Text als UTF-8; Binärdateien für `INCBIN` erlaubt |

Der Editor öffnet nur gültiges UTF-8. Andere Dateien zeigen einen Hinweis statt Text.

## BuildResult (nur im Speicher)

`success`, `rom?`, `symbols?`, `map?`, `diagnostics[]`, `durationMs`. Nach einer Änderung am Quelltext vermerkt der
Build-View „Source changed since this build“. Beim Neuladen ist das Ergebnis weg und jederzeit neu erzeugbar.

## Diagnostic

| Feld | Typ | Regel |
|---|---|---|
| `file` | `string \| null` | innerste Datei; `null`, wenn das Werkzeug keinen Ort nennt |
| `line` | `number \| null` | 1-basiert |
| `severity` | `'error' \| 'warning'` | |
| `message` | string | ohne Farbcodes |
| `tool` | `'rgbasm' \| 'rgblink' \| 'rgbfix'` | |

## Projektzustand der App (`ProjectState`, für Views nur lesend)

`project`, `activeFile`, `cursorTarget` (Datei und Zeile nach einem Tipp auf eine Meldung), `saveState`
(`saved | pending | failed`), `build`, `buildIsStale`, `projects` (Liste).

**Zustände des Builds**: `idle → running → finished | failed | timed-out`. Während `running` ist ein neuer Build
gesperrt.

## View-Zustand (im Layout, ohne Inhalte)

Editor, Build und Project speichern je `{ page }`. Datei und Text liegen im `ProjectState`.

## Projekt-Archiv (ZIP)

```text
project.json        { "formatVersion": 1, "name": ..., "settings": ... }
main.asm
include/...         beliebige Dateien des Projekts
```

Unbekannte `formatVersion` wird abgelehnt. `id` und `updatedAt` stehen nicht im Archiv. Die ZIP-Datei muss nicht
byte-gleich sein, der daraus gebaute Stand schon (SC-002).
