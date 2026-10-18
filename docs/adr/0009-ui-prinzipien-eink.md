# ADR-0009: UI-Prinzipien für E-Ink

- **Status**: akzeptiert
- **Datum**: 2026-10-18
- **Meilenstein**: M0

## Kontext

Die UI wird auch auf E-Ink-Smartphones und -Tablets bedient: wenige Graustufen, langsames Neuzeichnen, Ghosting bei Bewegung.

## Entscheidung

- Standard-Theme schwarz auf weiß, nur Graustufen; Bedeutung nie allein über Farbe (z. B. gestrichelter Rahmen für deaktiviert).
- Alle Farben, Abstände, Größen und Zeiten nur als Design-Tokens in `src/app/theme/tokens.css`; Zeiten stehen auf `0ms`. Auch das Manifest liest seine Farben aus den Tokens.
- Keine Transitions, Animationen, Hover-Zustände oder blinkenden Cursor; `data-motion="off"` ist Standard, `prefers-reduced-motion` wird respektiert.
- Deutlicher Fokusrahmen und Touch-Ziele von mindestens `--touch-target-min`.
- Blättern statt Dauer-Scrollen in langen Ansichten (ab M2/M4 relevant).
- Ausnahme: Spielinhalt im Screen-View; dafür gibt es ab M1 einen E-Ink-Modus.
- UI-Sprache ist Englisch, Texte direkt im Code.
- Durchsetzung: Stylelint-Regeln sowie Abnahmetests in Chromium (Graustufen inkl. Fokus/SVG, keine Bewegung, Touch-Zielgröße, Graustufen-Screenshot).

## Konsequenzen

Neue Komponenten können die Regeln nicht versehentlich brechen, ohne dass Lint oder Tests anschlagen.

## Bezüge

Briefing Abschnitt 4; Constitution V; `src/app/theme/README.md`.
