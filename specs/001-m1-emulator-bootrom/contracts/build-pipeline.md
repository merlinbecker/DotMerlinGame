# Vertrag: Build- und Prüfskripte (M1)

Ergänzt `specs/000-m0-scaffold/contracts/npm-scripts.md`.

## Neue npm-Skripte

| Skript | Wirkung | Voraussetzung |
|---|---|---|
| `npm run tools:rgbds` | `scripts/fetch-rgbds.ts`: RGBDS v1.0.4 (Linux x86_64) nach `.tools/rgbds/`, SHA-256-geprüft | Netz (einmalig) |
| `npm run bootrom:build` | `rgbasm`/`rgblink` auf `src/adapters/emulator/bootrom/dmg-boot.asm` → `generated/dmg-boot.ts` + `BUILD-INFO.json` | RGBDS |
| `npm run roms:build` | `scripts/build-test-roms.ts`: `tests/roms/src/*.asm` → `tests/roms/build/*.gb` (gitignored); erzeugt `src/core/rom/logo-hash.generated.ts` (committet) aus einem `rgbfix`-Referenz-ROM | RGBDS |
| `pretest` | `tools:rgbds` (falls fehlt) → `roms:build` | |
| `npm run core:build` | `scripts/build-core.sh`: SameBoy-Core im festen emsdk-Image → `src/adapters/emulator/sameboy/generated/` | Docker |
| `npm run core:verify` | `core:build`, dann `git diff --exit-code` auf `generated/` | Docker |

## Erweiterte Skripte

- `npm run check`: wie bisher **plus** Nachbau-Check von Boot-ROM und Logo-Hash (`bootrom:build`,
  `roms:build`, dann `git diff --exit-code` auf `bootrom/generated/` und `logo-hash.generated.ts`). Der Core-Nachbau gehört **nicht** dazu **(PI)**.
- `npm run licenses` / `licenses:generate`: berücksichtigen `third_party/*.md` für Komponenten außerhalb von
  npm (research.md R3).
- `npm run build`: kopiert `THIRD_PARTY_LICENSES` nach `dist/`.

## CI (`.github/workflows/ci.yml`)

| Job | Schritte |
|---|---|
| `check` (bestehend) | `npm ci` → Playwright-Chromium → `npm run check` (inkl. RGBDS-Download und Boot-ROM-Nachbau) |
| `core-reproducible` (neu) | `npm run core:verify`. Docker ist auf `ubuntu-latest` vorhanden, das Image ist per Digest festgelegt, der Klon-Pfad im Container ist fest (`/work/.build/sameboy`) |

## Festgelegte Eingaben (Single Source: das jeweilige Skript)

| Eingabe | Wert |
|---|---|
| SameBoy | `https://github.com/LIJI32/SameBoy`, Commit `26a56bd6a122a6318a456abd80558408742d5adf` |
| emsdk-Image | `emscripten/emsdk@sha256:cdefec943f04fd4b2b2fe23b0a1a346be9fc560ef5784a83faa27dd351381372` (6.0.11) |
| RGBDS | v1.0.4, `rgbds-linux-x86_64.tar.xz`, SHA-256 `3e19e50ea602e316be709160acaf0a708b1fa6d32d219ec541f244442895dbb7` |

Dieselben Werte stehen in `third_party/sameboy.md`, `third_party/emscripten.md`, ADR-0006 und arc42
Kapitel 7. Ein Test prüft, dass die Werte in Skript, `BUILD-INFO.json` und `third_party/sameboy.md`
übereinstimmen.
