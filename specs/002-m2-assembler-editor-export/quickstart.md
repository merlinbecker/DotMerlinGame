# Quickstart: M2 prüfen

## Voraussetzungen

Node.js 24, `npm ci`. Für `assembler:build` und `assembler:verify` zusätzlich Docker.

## Automatische Prüfung

```sh
npm run check
npm run assembler:verify
npm run core:verify
```

Erwartung: alles grün, der Nachbau des Assemblers ist byte-identisch.

## Szenarien

| Szenario | Erwartung | Nachweis |
|---|---|---|
| Beispiel anlegen, bauen, ausführen | läuft im Screen, `BuildFinished` mit 0 Fehlern | E2E, SC-001 |
| Export `.gb` | Logo `$0104–$0133` und Checksumme `$014D` gültig | Integration, FR-006 |
| Gleicher Quelltext WASM und nativ | ROM byte-identisch | Integration, R1 |
| Fehler-Set | Datei und Zeile stimmen, Tippen führt zur Zeile | Integration und E2E, SC-004 |
| Endlos-`REPT` | Abbruch nach 10 s, UI bedienbar, nächster Build geht | E2E |
| ZIP-Rundlauf | Dateien gleich, Build byte-identisch | Integration und E2E, SC-002 |
| Schlechte ZIPs (`../`, gefälschte Größe, ohne `project.json`) | abgelehnt, Projekte unverändert | Unit, FR-008 |
| Offline nach dem Laden | Build und Export gehen | E2E mit `setOffline`, SC-005 mit Grenze aus R4 |
| Gebautes ROM läuft | gespeichertes ROM und dessen Spielstand unverändert | E2E, R8 |
| E-Ink-Regeln im Editor | keine Bewegung, kein Blinken, Graustufen, kein seitliches Scrollen | E2E, FR-009 |

## Manuelle Prüfungen am Gerät

Gerät, Android- und Chrome-Version, Viewport und Messdauer notieren.

1. **Smartphone (SC-003)**: Beispiel bauen; `durationMs` im Build-View muss unter 5 s liegen.
2. **Boox Palma und Go Color 7 (FR-009)**: tippen mit Bildschirmtastatur, blättern, zoomen, Meldung antippen.
3. **Echte Hardware (SC-006, sofern verfügbar)**: exportierte `.gb` auf einer Flash-Cartridge starten.

Ergebnisse gehören nach `docs/abnahme/m2.md`.
