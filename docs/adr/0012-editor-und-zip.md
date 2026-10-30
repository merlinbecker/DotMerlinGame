# ADR-0012: Editor CodeMirror 6 und ZIP mit fflate

- **Status**: akzeptiert
- **Datum**: 2026-10-30
- **Meilenstein**: M2

## Kontext

M2 braucht einen Editor ohne Farbe, ohne blinkenden Cursor und mit Blättern (FR-009) sowie ZIP-Export und -Import mit
Schutz vor unsicheren Archiven (FR-007, FR-008, FR-012). Beides ist ausgelieferter Fremdcode (Constitution III, VI).

## Entscheidung

1. **Editor**: CodeMirror 6 (`@codemirror/state`, `view`, `commands`), MIT laut LICENSE-Dateien (Entscheidung des
   Projektinhabers, 2026-10-30). Eingebunden nur in `src/adapters/editor/`; der View bekommt die Komponente von
   `src/app/`. Hervorhebung und Blättern sind eigener Code.
2. **ZIP**: `fflate`, MIT laut LICENSE-Datei, nur in `src/adapters/archive/`.
3. **Grenzen beim Import** (Startwerte): 1000 Einträge, 16 MiB entpackt, 16 MiB Archiv. Bytes werden beim Entpacken
   gezählt, weil die Größenangaben im Archiv gefälscht sein können (im Spike belegt). Pfadregeln stehen in
   `src/core/project/paths.ts`.

## Konsequenzen

- Etwa 91 KB gzip für den Editor. Er liegt im Hauptbundle, weil ohne Service Worker kein Nachladen ohne Netz möglich ist.
- Das Blättern hängt an internen Klassen von CodeMirror (`.cm-scroller`). Ein Update muss die E2E-Tests bestehen.
- Eignung auf E-Ink ist am Gerät noch zu prüfen.

## Alternativen

- **Eigener Editor auf Textarea-Basis**: keine Abhängigkeit, aber ein Cursor ohne Blinken müsste selbst gezeichnet werden,
  und die Android-Eingabe ist fehleranfällig.
- **Monaco**: deutlich größer, auf Touch-Geräte nicht ausgelegt.
- **JSZip**: erwogen, aber `fflate` genügt und erlaubt Streaming mit eigenem Bytezähler.

## Bezüge

Constitution III, V, VI; `specs/002-m2-assembler-editor-export/research.md` R6, R7; `third_party/npm.md`.
