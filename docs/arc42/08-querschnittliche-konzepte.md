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

## 8.4 Versionsnummer und Build-Version

Die Fußzeile zeigt `v<Version> · Build <Commit-Hash>`.

- **Versionsnummer**: `version` in `package.json` ist die einzige Quelle, Vite setzt sie als `__APP_VERSION__` ein. Start bei `0.1.0`. Jeder Commit mit Codeänderung erhöht die Patch-Stelle; die Abnahme einer Spec erhöht die Minor-Stelle und setzt Patch auf 0 (Constitution, Entwicklungsablauf).
- **Build-Version**:

`build/build-version.ts` ermittelt beim Build den kurzen Commit-Hash, mit `-dirty` bei uncommitteten Änderungen und `unknown` ohne Git. Vite setzt ihn als `__BUILD_VERSION__` ein; die Fußzeile zeigt ihn immer an. Der Build schreibt ihn zusätzlich nach `dist/build-info.json` für die Abnahmetests.

## 8.5 Lizenz- und Secret-Prüfung

- `npm run licenses`: zweistufiger Lizenz-Check (Laufzeit strikt, Werkzeuge ohne Copyleft) und Aktualität von `THIRD_PARTY_LICENSES` ([ADR-0003](../adr/0003-fremdkomponenten-strategie.md)).
- Komponenten außerhalb von npm (ab M1: SameBoy-Core, Emscripten-Laufzeit) beschreibt je eine `third_party/<komponente>.md` mit Front Matter (Name, Version, SPDX-Lizenz, Lizenztextdatei, Quelle, Commit/Digest). Ihre Lizenz muss die Freigabeliste für ausgelieferten Code bestehen, ihr Lizenztext wird an `THIRD_PARTY_LICENSES` angehängt.
- `THIRD_PARTY_LICENSES` wird nach `dist/` kopiert und ist in der Fußzeile verlinkt, weil das WASM an jeden Browser verteilt wird.
- `npm run secrets`: secretlint über alle versionierten Dateien.
- ESLint verbietet in `src/` Importe aus `devDependencies`, damit nur geprüfter Laufzeitcode ausgeliefert wird.

## 8.6 Architekturregeln als Lint

ESLint erzwingt: `src/core` importiert weder React noch `adapters`, `views` oder `app`; `src/views` importiert keine `adapters`.

## 8.7 Eine Prüfquelle

`npm run check` führt Lint, Tests, Build (inkl. Typprüfung), Abnahmetests, Lizenz-Check und Secret-Scan in dieser Reihenfolge aus. Die CI (`.github/workflows/ci.yml`) ruft im Job `check` genau diesen Befehl auf.

**Ausnahme Core-Nachbau** (Entscheidung des Projektinhabers, M1): Der Docker-basierte Nachbau des Emulator-Cores läuft nicht in `npm run check`, sondern im eigenen CI-Job `core-reproducible` und lokal per `npm run core:verify`. So braucht der lokale Check kein Docker.

## 8.8 Reproduzierbare Artefakte

Generierte Dateien, die committet werden, entstehen nur über ihr Skript. Jede wird neu gebaut und muss byte-identisch bleiben (`git diff --exit-code`):

| Artefakt | Skript | Geprüft in |
|---|---|---|
| `src/adapters/emulator/sameboy/generated/` (SameBoy-WASM) | `npm run core:build` | CI-Job `core-reproducible`, lokal `npm run core:verify` |
| `src/adapters/emulator/bootrom/generated/` (eigene Boot-ROM) | `npm run bootrom:build` | `npm run check` |
| `src/core/rom/logo-hash.generated.ts` (SHA-256 des Header-Logos, keine Logo-Bytes) | `npm run roms:build` | `npm run check` |

Werkzeuge sind festgelegt: emsdk-Image per Digest, RGBDS per Version und SHA-256. Herkunft und Bauweg stehen in Kapitel 7.3.

## 8.9 Lesen ohne Nebenwirkung, Snapshots auf Anforderung (M1b)

- **Kein Lesen über den CPU-Pfad**: Der übliche Lesezugriff des Cores (`GB_safe_read_memory`) stößt PPU- und
  APU-Nachberechnungen an und zeigt gesperrten Cartridge-RAM nicht. Views und `changedMemory` lesen deshalb
  nur über direkte Zeiger (specs/004-m1b-memory-views/research.md R1–R3). `tests/emulator/inspection-identity`
  prüft für jedes Test-ROM 300 Frames lang gleiche Bild- und Tonausgabe mit und ohne Inspektion.
- **Innerer Zustand**: Gezeigt wird, was der Emulator hält, nicht was die CPU in diesem Moment lesen würde
  (z. B. I/O-Rohwerte, VRAM während der LCD-Sperre). Der Hex-View vermerkt das.
- **Bedarf**: Inspektionsdaten werden nur gebaut, solange ein sichtbarer Slot einen View mit
  `inspects: true` zeigt.
- **Anforderung statt Warten**: Bei Pause, Halt, Laden, Reset, beim Einhängen und mit „Refresh“ fordert ein
  Speicher-View genau einen Snapshot an (`RequestSnapshot`). Der Hub bündelt Anforderungen eines Tasks und
  kennzeichnet die Lieferung; andere Slots ignorieren sie, ihre Drosselung zählt nur echte Frames.

## Build-Pipeline und ROM als Ergebnis (M2)

- Jeder Build läuft im Worker mit frischen WASM-Instanzen. Nach 10 s beendet die App den Worker, ein vorbereiteter zweiter
  übernimmt (research.md R4).
- Das ROM liegt nur im Speicher. `RunBuild` schreibt nicht in den ROM-Speicher, und ein Build-Lauf ändert den Spielstand
  des gespeicherten ROMs nicht (Constitution I).
- **Offline**: Worker und WASM werden beim App-Start geladen. Der Build geht danach ohne Netz, ein Kaltstart ohne Netz erst
  mit dem Service Worker in M7.
- **Tastatur**: Die Spieltasten gelten nicht, solange ein Textfeld den Fokus hat. Ein gehaltener Knopf wird trotzdem
  losgelassen.
- **Autosave**: Text liegt sofort im Projektzustand und überlebt einen Wechsel des View-Inhalts. Gespeichert wird nach 1 s
  und sofort, wenn die Seite verborgen wird.

