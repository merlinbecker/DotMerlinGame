# Theme und Design-Tokens

Die Oberfläche ist E-Ink-first (Constitution V, ADR-0009): schwarz auf weiß, nur Graustufen, keine Bewegung.

## Regeln

- **Literalwerte nur in `tokens.css`.** Farben, Abstände, Rahmen, Größen und Zeiten stehen ausschließlich dort als CSS Custom Properties. Komponenten verwenden nur `var(--…)`. Stylelint erzwingt das: keine Hex-Farben, Farbfunktionen, Farbnamen, `px`, `ms` oder `s` außerhalb von `tokens.css`.
- **Nur Graustufen.** Bedeutung entsteht über Form, Strichstärke, Rahmenart (z. B. gestrichelt für deaktiviert), Invertierung oder Muster, nie allein über Farbe.
- **Keine Bewegung.** `transition*` und `animation*` sind in Komponenten verboten, ebenso `:hover`. Alle Zeit-Tokens stehen auf `0ms`.
- **Fokus** ist immer sichtbar: dicker schwarzer Rahmen aus `--focus-outline-*`.
- **Touch-Ziele** sind mindestens `--touch-target-min` groß.

## Bewegung abschalten

`<html data-motion="off">` ist der Standard. `base.css` setzt dann für alle Elemente `transition: none` und `animation: none`. Meldet das Gerät `prefers-reduced-motion: reduce`, gilt dasselbe unabhängig vom Attribut. Ausnahme ist später nur der Spielinhalt im Screen-View.

## Token-Kategorien

| Präfix | Inhalt |
|---|---|
| `--color-*` | Vorder-/Hintergrund, gedämpft, Rahmen, invertiert |
| `--space-*` | Abstandsskala 1–6 |
| `--border-width-*` | Rahmen von Slots, Kopfleisten, Bedienelementen |
| `--focus-outline-*` | Fokusrahmen |
| `--touch-target-min`, `--slot-min-size`, `--footer-height` | Größen |
| `--font-*` | Schrift, Größen, Gewichte |
| `--duration-*` | Zeiten (immer `0ms`) |

## Neues Token anlegen

1. Wert in `tokens.css` in der passenden Kategorie ergänzen (bei Farben nur Graustufen).
2. In Komponenten per `var(--name)` verwenden.
3. `npm run lint` und `npm run test:e2e` prüfen die Regeln.

Das Web-App-Manifest liest `--color-bg` und `--color-fg` direkt aus `tokens.css`.
