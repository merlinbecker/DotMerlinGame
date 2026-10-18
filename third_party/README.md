# third_party

Herkunftsnachweise für **ausgelieferten** Fremdcode (Constitution VI, ADR-0003). Reine Entwicklungswerkzeuge gehören nicht hierher.

## Inhalt

Ausgelieferte Komponenten außerhalb von npm (Stand M1): `sameboy.md` (Emulator-Core, Expat) und `emscripten.md` (Emscripten-Laufzeit im WASM, MIT und CC0). Die eigene Boot-ROM und die Test-ROMs sind eigener Code und keine Fremdkomponenten.

- `npm.md`: npm-Laufzeitabhängigkeiten (Paket, Version, Lizenz, Quelle). Erzeugt von `npm run licenses:generate`, nicht von Hand bearbeiten.
- `license-exceptions.json`: Ausnahmen vom Lizenz-Check. Jeder Eintrag `{ "package", "license", "adr" }` braucht ein begründendes ADR.
- `licenses/`: Lizenztexte der Komponenten außerhalb von npm, wörtlich aus deren LICENSE-Dateien.
- Je übernommener Komponente außerhalb von npm (ab M1, z. B. Emulator-Core, RGBDS-WASM) eine Datei `<komponente>.md`. Sie beginnt mit maschinenlesbarem Front Matter, das `npm run licenses:generate` und `npm run licenses` auswerten:

  ```
  ---
  name: SameBoy Core
  version: v1.0.4
  license: MIT              # SPDX-Ausdruck, muss die Freigabeliste für ausgelieferten Code bestehen
  licenseFile: licenses/sameboy-LICENSE   # relativ zu third_party/
  source: https://github.com/LIJI32/SameBoy
  commit: 26a56bd…          # Commit-Hash, Image-Digest o. ä.
  ---
  ```

  Danach folgt ein deutscher Text mit:
  - **Quelle** (Repository-URL)
  - **Version** und **Commit-Hash**
  - **Lizenz** (geprüft anhand der LICENSE-Datei, nicht aus dem Gedächtnis)
  - **Übernommene Teile** und eventuelle Änderungen
  - Verweis auf das ADR der Übernahme

Der Eintrag und der Lizenztext in `THIRD_PARTY_LICENSES` entstehen im selben Commit wie die Übernahme.
