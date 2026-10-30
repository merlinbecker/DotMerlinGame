---
name: RGBDS
version: v1.0.4
license: MIT
licenseFile: licenses/rgbds-LICENSE
source: https://github.com/gbdev/rgbds
commit: f7b8207322aa9e3714ef0d98d01989f320103026
---

# RGBDS (`rgbasm`, `rgblink`, `rgbfix` als WASM)

- **Quelle**: https://github.com/gbdev/rgbds
- **Version**: v1.0.4, Commit `f7b8207322aa9e3714ef0d98d01989f320103026`
- **Lizenz**: MIT laut `LICENSE` des genannten Commits.
- **Erzeugter Parser**: `src/asm/parser.cpp` und `src/link/script.cpp` entstehen beim Bau mit Bison 3.8.2 und
  enthalten dessen GPL-Skelett mit „special exception“, die die Verteilung in größeren Werken zu frei gewählten
  Bedingungen erlaubt. Der Text steht wörtlich in `licenses/rgbds-LICENSE`. Freigabe des Projektinhabers: ADR-0011.
- **Übernommene Teile**: `rgbasm`, `rgblink`, `rgbfix`, kompiliert nach
  `src/adapters/assembler/rgbds/generated/`. `rgbgfx` wird nicht gebaut.
- **Änderungen**: keine. Bauweg: `scripts/build-assembler.sh`, Nachweise in `generated/BUILD-INFO.json`.
- **Entscheidung**: ADR-0011.
