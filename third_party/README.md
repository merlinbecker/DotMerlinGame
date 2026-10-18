# third_party

Herkunftsnachweise für **ausgelieferten** Fremdcode (Constitution VI, ADR-0003). Reine Entwicklungswerkzeuge gehören nicht hierher.

## Inhalt

- `npm.md`: npm-Laufzeitabhängigkeiten (Paket, Version, Lizenz, Quelle). Erzeugt von `npm run licenses:generate`, nicht von Hand bearbeiten.
- `license-exceptions.json`: Ausnahmen vom Lizenz-Check. Jeder Eintrag `{ "package", "license", "adr" }` braucht ein begründendes ADR.
- Je übernommener Komponente außerhalb von npm (ab M1, z. B. Emulator-Core, RGBDS-WASM) eine Datei `<komponente>.md` mit:
  - **Quelle** (Repository-URL)
  - **Version** und **Commit-Hash**
  - **Lizenz** (geprüft anhand der LICENSE-Datei, nicht aus dem Gedächtnis)
  - **Übernommene Teile** und eventuelle Änderungen
  - Verweis auf das ADR der Übernahme

Der Eintrag und der Lizenztext in `THIRD_PARTY_LICENSES` entstehen im selben Commit wie die Übernahme.
