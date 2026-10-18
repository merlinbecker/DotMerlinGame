# Quickstart: M1 abnehmen

Anleitung zur Prüfung, ob M1 fertig ist. Details stehen in [contracts/](contracts/) und
[data-model.md](data-model.md).

## Voraussetzungen

- Node.js 24, `npm ci`, Playwright-Chromium (`npx playwright install chromium`)
- Linux x86_64 für RGBDS (Codespace oder CI). `npm test` lädt RGBDS v1.0.4 beim ersten Lauf nach
  `.tools/` herunter.
- Docker nur für `npm run core:verify`
- Ein Mittelklasse-Smartphone mit aktuellem Chrome und ein E-Ink-Gerät für die manuellen Prüfungen
- Ein freies Homebrew-ROM zum Ausprobieren (nicht im Repo), z. B. ein selbst gebautes aus
  `tests/roms/build/`

## Automatische Prüfungen

```bash
npm run check          # Lint, Unit-/Vertrags-/Typ-Tests, Build, E2E, Lizenzen, Secrets, Boot-ROM-Nachbau
npm run core:verify    # SameBoy-WASM aus festem Commit nachbauen, Hash identisch (Docker)
```

Erwartet: alles grün. Was die Tests abdecken:

| Test | Belegt |
|---|---|
| `tests/boot-state/` | Register und I/O nach eigener Boot-ROM = Pan Docs (Spalte DMG), je ein ROM mit Checksumme `$00` und ≠ `$00` (SC-001) |
| `tests/boot-state/handoff-equivalence` | vollständiger interner Zustand (inkl. VRAM, WRAM, HRAM, OAM) bei PC=`$0100` in beiden Startmodi identisch |
| `tests/emulator/modes-identical` | gleiche Bild- und Tonausgabe nach N Frames in beiden Modi, für jedes Test-ROM (SC-002, FR-010, Constitution VII) |
| `tests/emulator/mbc` | ROM ohne MBC, MBC1, MBC3, MBC5 laufen, Bankwechsel korrekt (FR-001) |
| `tests/emulator/battery` | Spielstand speichern → neu laden → wiederhergestellt, wird beim Ersetzen gelöscht (FR-026) |
| `tests/emulator/audio-channels` | jeder der vier Tonkanäle in den Audiodaten nachweisbar (US4-AS5) |
| `tests/emulator/hardware-checks` | Logo oder Checksumme kaputt + „Hardware-nah“ → Halt und `EmulatorHalted`, ohne den Modus → läuft mit Hinweis |
| `tests/emulator/determinism` | gleiche Eingaben ergeben gleiche Ausgabe |
| `tests/unit/rom-header`, `memory-map` | Header-Felder, CGB-Ablehnung, Adressbereiche laut Pan Docs (FR-017, FR-025) |
| `tests/contract/` | erweiterte Typen (Union-Erweiterungen, `screen` 0–3), Pro-Slot-Quelle: unsichtbar ergibt 0 Updates (SC-006) |
| `tests/unit/build-info` | festgelegte Commits/Digests in Skript, `BUILD-INFO.json`, `third_party/` stimmen überein |
| `tests/e2e/m1-*.spec.ts` | ROM laden → Logo → Spiel. Tasten wirken, auch mehrere gleichzeitig. Neu laden stellt ROM, Layout und Einstellungen wieder her. Zoom per Schalter in jeder Kopfleiste, Doppeltipp zoomt nicht. E-Ink-Modus drosselt das Neuzeichnen. Keine Animationen, nur Graustufen |

## Manuelle Prüfungen am Gerät

1. `npm run build && npm run preview`, mit dem Smartphone im WLAN öffnen.
2. Im View **ROM Info** ein ROM laden. Erwartet: eigenes Logo, danach das Spiel. Zeit von der
   Dateiauswahl bis zum Spiel unter 5 s (SC-005).
3. Spielen über das **Controller**-Quadrat, die Tastatur (WASD, J = A, K = B, Enter = Start,
   Leertaste = Select) und einen Bluetooth-Game-Controller. Ein Controller erscheint in ROM Info nach
   dem ersten Tastendruck. Flüssig ohne Ruckeln (SC-003), die Reaktion fühlt sich unmittelbar an
   (SC-004).
4. Ton: erstes Tippen gibt ihn frei. Stumm in der Kopfleiste des Screens, Lautstärke in ROM Info.
   10 Minuten spielen ohne Aussetzer, synchron zum Bild (SC-007).
5. Tab wechseln, Gerät sperren, zurückkehren: kein Zeitsprung, kein Knacken (FR-020).
6. Ein zweites ROM laden: Hinweis „replaces ROM and save“, danach ersetzt.
7. Auf dem E-Ink-Gerät den E-Ink-Modus des Screens einschalten: ruhiges Bild, vier Graustufen
   unterscheidbar, Spielgeschwindigkeit und Ton normal (SC-008).
8. Ergebnis in `docs/abnahme/m1.md` protokollieren (Gerät, Chrome-Version, Messwerte), wie bei M0.
