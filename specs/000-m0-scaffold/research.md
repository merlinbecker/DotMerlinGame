# Research: M0 – Gerüst

**Stand**: 2026-10-18 · Versionen per `npm view` ermittelt, Lizenzen der Laufzeit-Abhängigkeiten anhand
der LICENSE-Dateien in `node_modules` geprüft (Testinstallation im Scratchpad).

## R1 – Werkzeug-Versionen

**Decision**: Node.js 24 (LTS), TypeScript **6.0.3**, Vite 8.3.4, @vitejs/plugin-react 6.1.2,
React/React-DOM 19.3.1, Vitest 5.0.5, jsdom 30.1.3, @testing-library/react 16.3.3,
@playwright/test 1.64.1, ESLint 10.13.0 + typescript-eslint 8.71.2, Stylelint 17.16.0 +
stylelint-config-standard 40.0.0, secretlint 13.0.7 + @secretlint/secretlint-rule-preset-recommend 13.0.7,
license-checker-rseidelsohn 5.0.1, eslint-plugin-import-x 4.17.1 (MIT). Exakte Versionen in `package.json`, `package-lock.json` committet.

**Rationale**: Aktuelle Major-Versionen mit passenden Peer-Abhängigkeiten. typescript-eslint 8.71.2
verlangt `typescript >=4.8.4 <6.1.0` – deshalb TypeScript 6.0.3 statt 7.0.2. vitest 5 akzeptiert
Vite 8, plugin-react 6 verlangt Vite 8.

**Alternatives considered**: TypeScript 7.0.2 (nativer Compiler) – verworfen, weil typescript-eslint
ihn noch nicht unterstützt. Wechsel, sobald die Peer-Range es erlaubt.

## R2 – Lizenz-Check

**Decision**: Eigenes Skript `scripts/check-licenses.mjs` auf Basis der JSON-Ausgabe von
license-checker-rseidelsohn, zweistufig (Entscheidung des Projektinhabers, 2026-10-18):

| Bereich | Regel |
|---|---|
| Ausgelieferter Code (`dependencies`) | Strikte Freigabeliste: MIT, BSD-2-Clause, BSD-3-Clause, ISC, Apache-2.0, Zlib, 0BSD, CC0-1.0, Unlicense. SPDX-Ausdrücke: `OR` → mindestens eine Lizenz erlaubt, `AND` → alle erlaubt. |
| Entwicklungswerkzeuge (`devDependencies`) | Blockiert nur bei GPL, AGPL, LGPL, SSPL (jede Variante, z. B. `-only`, `-or-later`) sowie bei fehlender/unbekannter Lizenz. Alles andere wird nur aufgelistet. |
| Ausnahmen | Datei `third_party/license-exceptions.json`, jeder Eintrag verweist auf ein ADR. In M0 leer. |

**Rationale**: Testinstallation ergab: Laufzeit (react, react-dom, scheduler) besteht die Freigabeliste.
In den Entwicklungswerkzeugen fallen ~25 Pakete heraus, keines davon GPL: BlueOak-1.0.0 (glob,
minimatch, lru-cache, tar …), MIT-0 (@csstools/*), Python-2.0 (argparse), Artistic-2.0
(istextorbinary …), MPL-2.0 (lightningcss), CC-BY-3.0 (spdx-exceptions), WTFPL (@azu/style-format).
Ein eigenes Skript ist nötig, weil `--failOn` exakt vergleicht und z. B. `GPL-3.0-or-later` nicht
erfassen würde. Das Skript ist klein und per Unit-Test prüfbar (SC-007).

**Absicherung der Zuordnung**: Die strikte Stufe hängt daran, dass ausgelieferter Code nur aus
`dependencies` stammt. ESLint (`import-x/no-extraneous-dependencies`) verbietet deshalb in `src/**`
Importe aus `devDependencies`; in `tests/`, `build/`, `scripts/` sind sie erlaubt.

**Alternatives considered**: Alles strikt mit ~25 ADR-Ausnahmen (zu viel Pflege); nur Laufzeit prüfen
(GPL in Werkzeugen fiele nicht auf); `--onlyAllow`/`--failOn` direkt (Variantenproblem).

## R3 – Herkunftsnachweis (`third_party/`, `THIRD_PARTY_LICENSES`)

**Decision**: Einträge nur für Code, der ausgeliefert wird (Laufzeit-Abhängigkeiten und später
übernommene Fremdkomponenten wie Emulator-Core oder RGBDS). `THIRD_PARTY_LICENSES` wird per Skript
(`npm run licenses:generate`) aus den LICENSE-Dateien der Laufzeit-Abhängigkeiten erzeugt; die CI
prüft, dass die Datei aktuell ist. `third_party/README.md` erklärt das Format, `third_party/npm.md`
listet Paket, Version, Lizenz und Quelle der Laufzeit-Abhängigkeiten.

**Rationale**: Entwicklungswerkzeuge werden nicht verteilt; hunderte Einträge wären wertlos.
Lizenz von react, react-dom, scheduler: MIT laut LICENSE-Datei (geprüft).

## R4 – Secret-Scan

**Decision**: secretlint mit `@secretlint/secretlint-rule-preset-recommend` über alle versionierten
Dateien (`git ls-files`). Teil von `npm run check`, läuft damit lokal und in der CI gleich.
Der Test für SC-007 erzeugt ein Test-Secret zur Laufzeit in einem temporären Verzeichnis; es wird
nie eine Secret-ähnliche Zeichenkette committet.

**Rationale**: Reines npm-Werkzeug (MIT), kein zusätzliches Binary, gleiche Prüfung lokal und in CI.

**Alternatives considered**: gitleaks (würde auch die Historie scannen, braucht aber ein eigenes
Binary bzw. eine eigene Action). Kann später als zusätzliche CI-Stufe ergänzt werden.

## R5 – Build-Version (Commit-Hash)

**Decision**: `vite.config.ts` liest `git rev-parse --short HEAD` und injiziert den Wert per
`define` als `__BUILD_VERSION__`. Schlägt der Befehl fehl (kein Git), wird `"unknown"` verwendet,
der Build läuft weiter. Bei uncommitteten Änderungen wird `-dirty` angehängt. Der Build schreibt den Wert zusätzlich nach
`dist/build-info.json` (Grundlage des E2E-Tests). `dist/`, `test-results/`, `playwright-report/`
und `coverage/` stehen in `.gitignore`, damit Testläufe den Stand nicht als `-dirty` markieren.

## R6 – Projektname an einer Stelle, Manifest ohne Service Worker

**Decision**: `src/config/project.ts` exportiert `PROJECT_NAME`. Ein kleines eigenes Vite-Plugin
(`build/manifest-plugin.ts`) erzeugt daraus `manifest.webmanifest` und setzt `<title>`.
Kein vite-plugin-pwa (würde einen Service Worker erzeugen).
Icons: selbst gezeichnetes SVG-Logo; PNG 192/512 werden einmalig per Skript mit Playwright aus dem
SVG gerendert und committet (keine zusätzliche Abhängigkeit).

**Installierbarkeit ohne Service Worker**: Die Kriterien von Chrome (web.dev, „What does it take to
be installable?“, https://web.dev/articles/install-criteria, Stand 2024-09-19) verlangen HTTPS, ein
Manifest mit `name`/`short_name`, Icons in 192 px und 512 px, `start_url`, `display` (`standalone`
u. a.) und kein `prefer_related_applications: true`. Ein Service Worker wird dort nicht gefordert.
US1, Szenario 4 bleibt daher in M0 erfüllbar.

**Offen (Constitution X)**: Die Quelle nennt Größen, aber kein Format. PNG wird mitgeliefert; die
Installierbarkeit wird in der Abnahme mit den Chrome DevTools (Application → Manifest) geprüft.

## R7 – Design-Tokens, Schwarz-Weiß, keine Bewegung

**Decision**:
- `src/app/theme/tokens.css`: einzige Datei mit Literalwerten für Farben, Abstände, Rahmen, Zeiten
  (CSS Custom Properties). Farben nur Graustufen.
- Bewegung: Zeit-Tokens stehen im Standard auf `0ms`; `<html data-motion="off">` ist Standard,
  eine globale Regel setzt dann `transition: none` und `animation: none`. `prefers-reduced-motion`
  erzwingt `off`.
- Fokus: Der Fokusrahmen ist ausdrücklich über Tokens festgelegt (schwarz, dicke Linie, Abstand),
  der farbige Standard-Fokusring von Chrome wird ersetzt.
- Durchsetzung per Stylelint: keine Hex-/Farbfunktionen und keine `px`-Werte außerhalb von
  `tokens.css`; Eigenschaften `transition*` und `animation*` sind außerhalb der Motion-Regel verboten;
  kein `:hover`.
- Styling mit CSS Modules (in Vite eingebaut), keine CSS-in-JS-Bibliothek.

## R8 – Automatische Abnahmeprüfungen (Chromium)

**Decision**: Playwright-Tests nur im Chromium-Projekt gegen den Produktions-Build (`vite preview`):

| Abnahme | Prüfung |
|---|---|
| Kein Service Worker | `navigator.serviceWorker.getRegistrations()` liefert `[]` nach Laden und Warten |
| Keine Animationen | `document.getAnimations()` ist leer; berechnete `transition-duration`/`animation-name` aller Elemente sind `0s`/`none` |
| Ohne Farbe bedienbar | Für alle Elemente gilt bei `color`, `background-color`, `border-*-color`, `outline-color`, `caret-color` sowie SVG `fill`/`stroke`: R = G = B. Der Test geht per Tab durch alle Bedienelemente und prüft auch den fokussierten Zustand. Zusätzlich Screenshot in Graustufen als Abnahme-Dokumentation (SC-005, manuell bewertet) |
| Build-Version sichtbar | Fußzeile enthält genau den Wert, den der Build eingesetzt hat (aus `dist/build-info.json`, nicht per erneutem `git rev-parse`) |
| Querformat | Viewport drehen → Slots nebeneinander |
| Manifest | `link[rel=manifest]` vorhanden, Name = `PROJECT_NAME` |

## R9 – Raster

**Decision**: Spaltenzahl und Zeilenzahl werden aus Viewport und einem Token für die minimale
Slotgröße berechnet, begrenzt auf 1–4 je Richtung und mindestens zwei Slots (Hochformat 1×2,
Querformat 2×1). Slots sind quadratisch (`aspect-ratio: 1`). Passen nicht einmal zwei Slots in
Mindestgröße (kleine Handys im Querformat, Breite < 320 px), schrumpfen die Slots unter die
Mindestgröße; es werden nie weniger als zwei Slots und nie horizontales Scrollen erzeugt. Berechnung als reine Funktion in
`src/app/layout/` mit Unit-Tests; das Layout speichert nur die Belegung (Slot → View).

## R10 – Typ-Tests für Verträge

**Decision**: Vitest `expectTypeOf` und `// @ts-expect-error` in `tests/contract/*.test-d.ts`,
geprüft durch `vitest --typecheck` (nutzt `tsc`, TypeScript 6). Belegt u. a., dass ein Ereignis
mit unbekanntem Typ nicht veröffentlicht werden kann.

## R11 – Architekturregeln automatisch prüfen

**Decision**: ESLint `no-restricted-imports`:
- `src/core/**` darf weder `react` noch `src/adapters`, `src/views`, `src/app` importieren.
- `src/views/**` darf `src/adapters` nicht importieren (Zugriff nur über Ports aus `src/core`).
- `src/**` darf keine `devDependencies` importieren (`import-x/no-extraneous-dependencies`, siehe R2).

## R12 – CI

**Decision**: GitHub Actions, ein Workflow `.github/workflows/ci.yml` auf `push` und `pull_request`:
Checkout → Node 24 mit npm-Cache → `npm ci` → `npx playwright install --with-deps chromium` →
`npm run check`. Actions per Commit-SHA gepinnt (ermittelt per `git ls-remote`, 2026-10-18):
`actions/checkout` v7.0.1 = `3d3c42e5aac5ba805825da76410c181273ba90b1`,
`actions/setup-node` v7.1.0 = `949feb2413d6458794dcd2491c4babbbce0c15c1`. `npm run check` ist die einzige Prüfquelle,
damit lokal und CI nicht auseinanderlaufen.

## R13 – Ignorier-Regeln für ROMs

**Decision**: `.gitignore` schließt `*.gb`, `*.gbc`, `*.sgb`, `roms/` und typische Boot-ROM-Namen
(`dmg_boot.bin`, `dmg0_boot.bin`, `*boot*.bin` im Wurzelverzeichnis von `roms/`) aus, aber nicht
pauschal `*.bin`, weil RGBDS-Projekte `.bin`-Dateien per `INCBIN` einbinden (Beispiele ab M2).
Build-Ergebnisse von Beispielprojekten liegen in ignorierten `build/`-Unterordnern der Projekte.

## R14 – Ausstehende Tests

**Decision**: Roundtrip- und Boot-Zustandstests als `it.todo(...)` mit Verweis auf M1/M3; sie
erscheinen im Testbericht, brechen die Suite aber nicht.
