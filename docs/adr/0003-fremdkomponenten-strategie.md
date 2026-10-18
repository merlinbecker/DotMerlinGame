# ADR-0003: Fremdkomponenten-Strategie

- **Status**: akzeptiert
- **Datum**: 2026-10-18
- **Meilenstein**: M0

## Kontext

Emulator-Core, Assembler, Speicher und ZIP kommen ganz oder teilweise von außen. Das Projekt steht unter MIT, GPL ist ausgeschlossen, und das Repo ist öffentlich.

## Entscheidung

1. **Ports und Adapter**: Fremdkomponenten stehen hinter eigenen Interfaces in `src/core/ports/`; Fremdcode lebt nur in `src/adapters/` bzw. `third_party/`. ESLint erzwingt, dass `src/core` keine äußeren Schichten importiert.
2. **Vorlage statt Fundament**: Code aus Vorlage-Repos (z. B. rgbds-live) wird nur bewusst und per ADR übernommen.
3. **Fremdkomponente = ausgelieferter Code** (Laufzeit-Abhängigkeiten und übernommene Komponenten). Nur diese bekommen Einträge in `third_party/` und `THIRD_PARTY_LICENSES`. Reine Entwicklungswerkzeuge nicht.
4. **Zweistufiger Lizenz-Check** (`npm run licenses`):
   - Laufzeit: strikte Freigabeliste MIT, BSD-2-Clause, BSD-3-Clause, ISC, Apache-2.0, Zlib, 0BSD, CC0-1.0, Unlicense.
   - Entwicklungswerkzeuge: blockiert nur bei GPL, AGPL, LGPL, SSPL (jede Variante) oder fehlender Lizenz; andere Lizenzen werden aufgelistet.
   - Ausnahmen nur in `third_party/license-exceptions.json`, jede mit Verweis auf ein ADR.
5. App-Code (`src/`) darf keine `devDependencies` importieren, damit die strikte Stufe nicht umgangen wird.
6. `THIRD_PARTY_LICENSES` und `third_party/npm.md` werden per Skript erzeugt; die CI prüft, dass sie aktuell sind.

## Konsequenzen

Rund 25 Entwicklungswerkzeuge mit Lizenzen wie BlueOak-1.0.0, MIT-0, Python-2.0, Artistic-2.0, MPL-2.0 oder CC-BY-3.0 sind erlaubt, werden aber bei jedem Check sichtbar aufgelistet. Lizenzen werden anhand der LICENSE-Dateien geprüft, nicht aus dem Gedächtnis.

## Alternativen

Alles strikt mit Einzelausnahmen (zu viel Pflege); nur Laufzeit prüfen (GPL in Werkzeugen fiele nicht auf).

## Bezüge

Constitution III, VI (Version 1.1.2); `specs/000-m0-scaffold/research.md` R2, R3; Entscheidung des Projektinhabers vom 2026-10-18.
