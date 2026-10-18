# 8. Querschnittliche Konzepte

## 8.1 Design-Tokens und E-Ink-Regeln

Alle Farben, Abstände, Rahmen, Größen und Zeiten stehen ausschließlich in `src/app/theme/tokens.css`. Komponenten nutzen nur `var(--…)`. Farben sind Graustufen; Bedeutung entsteht über Form, Strichstärke, Rahmenart oder Invertierung. Zeit-Tokens stehen auf `0ms`. Details: [Theme-README](../../src/app/theme/README.md), [ADR-0009](../adr/0009-ui-prinzipien-eink.md).

**Durchsetzung**:
- Stylelint verbietet außerhalb von `tokens.css` Hex-Farben, Farbfunktionen, Farbnamen, `px`, `ms`, `s`, `transition*`, `animation*` und `:hover`.
- Abnahmetests in Chromium prüfen: alle berechneten Farben (inkl. Fokus, Cursor, SVG) sind grau, keine Animationen oder Transitions (auch mit `prefers-reduced-motion`), Touch-Ziele mindestens `--touch-target-min`, sichtbarer Fokusrahmen.

## 8.2 Bewegung

`<html data-motion="off">` ist Standard; `base.css` schaltet dann Transitions und Animationen global ab. `prefers-reduced-motion: reduce` erzwingt dasselbe. Ausnahme ab M1: Spielinhalt im Screen-View.

## 8.3 Fokus und Bedienbarkeit

Fokus ist immer als dicker schwarzer Rahmen sichtbar (`--focus-outline-*`). Noch nicht nutzbare Bedienelemente sind `aria-disabled` statt `disabled`, damit sie per Tastatur erreichbar und vorlesbar bleiben; optisch erkennbar am gestrichelten Rahmen.

## 8.4 Build-Version

`build/build-version.ts` ermittelt beim Build den kurzen Commit-Hash, mit `-dirty` bei uncommitteten Änderungen und `unknown` ohne Git. Vite setzt ihn als `__BUILD_VERSION__` ein; die Fußzeile zeigt ihn immer an. Der Build schreibt ihn zusätzlich nach `dist/build-info.json` für die Abnahmetests.

## 8.5 Lizenz- und Secret-Prüfung

- `npm run licenses`: zweistufiger Lizenz-Check (Laufzeit strikt, Werkzeuge ohne Copyleft) und Aktualität von `THIRD_PARTY_LICENSES` ([ADR-0003](../adr/0003-fremdkomponenten-strategie.md)).
- `npm run secrets`: secretlint über alle versionierten Dateien.
- ESLint verbietet in `src/` Importe aus `devDependencies`, damit nur geprüfter Laufzeitcode ausgeliefert wird.

## 8.6 Architekturregeln als Lint

ESLint erzwingt: `src/core` importiert weder React noch `adapters`, `views` oder `app`; `src/views` importiert keine `adapters`.

## 8.7 Eine Prüfquelle

`npm run check` führt Lint, Typprüfung, Tests, Build, Abnahmetests, Lizenz-Check und Secret-Scan in dieser Reihenfolge aus. Die CI (`.github/workflows/ci.yml`) ruft genau diesen Befehl auf.
