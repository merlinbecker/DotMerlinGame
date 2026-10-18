# CLAUDE.md – DotMerlinGame

Mobile-first Web-IDE für Game-Boy-Homebrew (nur DMG-01, kein Game Boy Color). Alles läuft lokal im Browser. Es gibt kein Backend: Die App ist rein clientseitig und wird statisch ausgeliefert (vorerst über Replit).
Lies zuerst `docs/BOOTSTRAP-BRIEFING.md`. Es ist die freigegebene Grundlage für Vision, Architektur, Meilensteine und Regeln. Bei Widersprüchen gilt: Briefing > ADRs > diese Datei > eigene Annahmen. Frag nach, wenn etwas unklar ist, statt zu raten.

## Sprache

- Dokumentation (arc42, ADRs, Briefing): Deutsch
- Code, Bezeichner, Commit-Messages, Kommentare: Englisch
- Antworten an den Menschen: Deutsch, direkt und ohne Umschweife
- UI-Texte der App: nur Englisch, direkt im Code (keine Übersetzungsinfrastruktur)

## Stack

TypeScript, Vite, Vitest, React. Zielbrowser in M0–M3: nur aktuelles Chrome (inkl. Android und E-Ink). IndexedDB für Persistenz, ZIP für Export/Import. RGBDS als WASM. Emulator-Core wird in M1 per ADR gewählt.

## Architekturregeln (nicht verhandelbar)

1. **Der Quelltext ist die einzige Wahrheit.** ROMs werden beim Import disassembliert. Jeder Lauf ist Assemblieren, dann Emulieren. Das ROM ist nur Build-Ergebnis.
2. **Der Emulator ist ein Headless Service.** Views lesen nur Zustand und abonnieren Events, sie greifen nie direkt in den Emulator.
3. **Ports und Adapter.** Emulator-Core, Assembler, Projektspeicher und ZIP stehen hinter eigenen Interfaces in `src/core/`. Fremdcode lebt nur in `src/adapters/` bzw. `third_party/`.
4. **Zwei Eventkanäle, kein String-Bus:** Frame-Zustand als Snapshot (Views ziehen, nur wenn sichtbar, Rate drosselbar) und diskrete Ereignisse als getypte Union.
5. **Layout getrennt vom Zustand.** Das Raster speichert nur, welcher View in welchem Slot liegt.
6. **Projektname nur an einer Stelle** (Konstante/Config).

## UI-Regeln (E-Ink-first)

- Schwarz-Weiß, hoher Kontrast, Graustufen. Farbe ist nie der alleinige Bedeutungsträger.
- Keine UI-Animationen, keine Transitions, kein blinkender Cursor. `prefers-reduced-motion` respektieren. Ausnahme: Spielinhalt im Screen-View.
- Blättern statt Dauer-Scrolling in langen Listen und Hex-/Code-Ansichten.
- Farben, Abstände und Zeiten nur über Design-Tokens, nie als Einzelwerte in Komponenten.
- Große Touch-Ziele, keine Hover-Zustände. Wechsel des View-Inhalts nur über die Kopfleiste des Quadrats.
- Service Worker bleibt bis M7 aus (oder hinter Build-Flag). Es gibt nur ein Manifest. Die Build-Version (Commit-Hash) ist immer sichtbar.

## Lizenzen und Recht

- Projektlizenz ist MIT.
- **Kein GPL-Code.** Nichts übernehmen, abschreiben oder "nachbauen", was unter GPL steht (z. B. Gambatte). Im Zweifel stoppen und fragen.
- Fremdkomponente = ausgelieferter Code (Laufzeit-Abhängigkeiten, übernommene Komponenten). Reine Entwicklungswerkzeuge (devDependencies) brauchen keinen `third_party/`-Eintrag und kein ADR, dürfen aber kein GPL/AGPL/LGPL/SSPL haben.
- Fremdkomponenten nur mit Eintrag in `third_party/` (Quelle, Version, Lizenz, Commit-Hash) und `THIRD_PARTY_LICENSES`, im selben Commit wie die Übernahme. Lizenz anhand der LICENSE-Datei prüfen, nicht aus dem Gedächtnis.
- Übernahme aus Vorlage-Repos (z. B. rgbds-live) nur bewusst und mit ADR. Vorlagen sind Referenz, kein Fundament.
- **Nie committen:** ROMs (auch Homebrew nur, wenn die Lizenz es erlaubt und ein ADR existiert), Disassemblies kommerzieller ROMs, Nintendo-Boot-ROMs, Secrets, persönliche Pfade. `.gitignore` schließt ROMs aus. Tests nutzen nur selbst gebaute oder frei lizenzierte ROMs.
- Kein "Game Boy" oder "Boy" im Projektnamen, Logo oder Paketnamen. Beschreibend ("für Game-Boy-Homebrew") ist erlaubt.

## Arbeitsweise

1. **Ein Modul pro Auftrag.** Änderungen außerhalb des eigenen Moduls nur nach Rückfrage.
2. **Plan zuerst:** Vor größerem Code kurz die Schritte benennen und bei echten Entscheidungen fragen. Kleine, klar abgegrenzte Aufgaben direkt umsetzen.
3. **Tests pro Baustein.** Ohne grüne Tests (`npm test`) und grüne CI ist nichts fertig. Fehlschlagende Tests nicht abschwächen oder auskommentieren, um grün zu werden.
4. **Definition of Done je Aufgabe:**
   - Tests geschrieben und grün
   - betroffene arc42-Kapitel in `docs/arc42/` aktualisiert
   - Entscheidungen als ADR in `docs/adr/` (Vorlage dort)
   - `third_party/` und `THIRD_PARTY_LICENSES` aktuell, falls Fremdcode berührt
   - Abnahmekriterien des Meilensteins geprüft
5. **Versionsnummer** in `package.json` (Start `0.1.0`): Jeder Commit mit Codeänderung erhöht die Patch-Stelle um eins; mit der Abnahme einer Spec steigt die Minor-Stelle um eins, Patch auf 0. Reine Doku-Commits ändern die Version nicht.
6. **Kleine, nachvollziehbare Commits** mit sprechenden Messages. Das Repo ist öffentlich: Historie bleibt, also nichts Privates und keine Secrets, auch nicht "vorübergehend".
7. **Nichts erfinden.** Keine Annahmen zu Lizenzen, Hardware-Verhalten oder Registerwerten aus dem Gedächtnis. Maßgeblich sind Pan Docs, die RGBDS-Dokumentation und die LICENSE-Dateien. Unsicheres als offenen Punkt notieren.
8. **Meilensteine strikt in Reihenfolge** (M0 → M1 → M2 → M3). Nicht vorgreifen, nicht "nebenbei" Features aus späteren Meilensteinen bauen.

## Hardware-Treue (wichtig für Export)

- Exportierte `.gb` müssen auf echter Hardware starten: Header-Logo `$0104–$0133` unverändert, Header-Checksumme (`$014D`) korrekt, Erzeugung per `rgbfix` in der Build-Pipeline.
- Die eigene DotMerlinGame-Boot-ROM existiert nur im Emulator und ist kompatibel zur Nintendo-Boot-ROM: Sie hinterlässt den Zustand nach dem Boot exakt wie das Original (Werte aus Pan Docs, "Power Up Sequence", als Tests). Fremde Boot-ROMs werden nicht eingebunden.
- Spiele dürfen sich nie auf den Inhalt der Boot-ROM verlassen. Jedes Test-ROM muss mit eigener Boot-ROM und ohne Boot-ROM identisch laufen.

## Befehle

- `npm run dev` – Dev-Server, auch im WLAN erreichbar (ohne Service Worker)
- `npm run build` – Typprüfung und Produktions-Build nach `dist/` (nur statische Dateien)
- `npm run preview` – liefert `dist/` lokal aus
- `npm test` – Vitest (Unit-, Vertrags- und Typ-Tests)
- `npm run test:e2e` – Playwright-Abnahmetests in Chromium (braucht vorher `npm run build`)
- `npm run lint` – ESLint (inkl. Architekturregeln) und Stylelint (Token- und E-Ink-Regeln)
- `npm run typecheck` – TypeScript für App, Tests, Build- und Hilfsskripte
- `npm run licenses` – zweistufiger Lizenz-Check und Aktualität von `THIRD_PARTY_LICENSES`
- `npm run licenses:generate` – erzeugt `THIRD_PARTY_LICENSES` und `third_party/npm.md` neu (nach Änderung von `dependencies`)
- `npm run secrets` – Secret-Scan über alle versionierten Dateien
- `npm run tools:rgbds` – lädt RGBDS v1.0.4 (SHA-256-geprüft) nach `.tools/`
- `npm run roms:build` – baut die eigenen Test-ROMs nach `tests/roms/build/` (läuft als `pretest`) und erzeugt den Logo-Hash
- `npm run bootrom:build` – baut die eigene Boot-ROM nach `src/adapters/emulator/bootrom/generated/`
- `npm run core:build` – baut den SameBoy-Core nach WASM (Docker, festgelegtes emsdk-Image)
- `npm run core:verify` – baut den Core neu und prüft, dass das committete Artefakt identisch ist
- `npm run check` – alles oben in Reihenfolge, genau wie die CI (außer dem Core-Nachbau, der im CI-Job `core-reproducible` läuft)

## Verzeichnisse

- `docs/arc42/` – Architekturdokumentation (Deutsch)
- `docs/adr/` – Architekturentscheidungen
- `third_party/` – Herkunftsnachweise für Fremdkomponenten
- `src/core/` – Ports, Projektmodell, Events
- `src/adapters/` – Emulator, RGBDS-WASM, Storage, ZIP
- `src/views/` – ein Ordner pro View
- `src/app/` – Raster, Navigation, PWA-Shell
- `tests/` – Roundtrip, Boot-Zustand, View-Vertrag
- `examples/` – selbst geschriebene, lizenzfreie Beispielprojekte
