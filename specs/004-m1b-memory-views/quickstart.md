# Quickstart: M1b abnehmen

So prüfst du, ob M1b fertig ist. Die Typen und Regeln stehen in [contracts/](contracts/) und
[data-model.md](data-model.md).

## Voraussetzungen

Wie M1 ([../001-m1-emulator-bootrom/quickstart.md](../001-m1-emulator-bootrom/quickstart.md)): Node.js 24,
`npm ci`, Playwright-Chromium. Docker brauchst du nur für `npm run core:build` und `npm run core:verify`,
weil sich `wrapper.c` ändert. Für die Gerätetests brauchst du ein Smartphone mit aktuellem Chrome, den Boox
Palma und den Boox Go Color 7.

## Automatische Prüfungen

```bash
npm run check          # wie CI
npm run core:verify    # WASM mit neuem Wrapper nachgebaut, Hash identisch
```

Erwartet: Alles ist grün.

| Test | Belegt |
|---|---|
| `tests/emulator/inspection-identity` | 300 Frames je Test-ROM: Bild und alle Ton-Samples sind gleich, egal ob kein Snapshot, Snapshots ohne `inspection` oder mit `inspection` in jedem Frame gebaut werden (SC-003, FR-012) |
| `tests/emulator/inspection` | Inhalte von ROM-Bänken, RAM-Bänken (inkl. „gesperrt“), WRAM, HRAM, IE, VRAM, OAM, I/O (DIV) gegen `inspect-mem` und `inspect-gfx` (SC-001) |
| `tests/unit/inspect-*` | Pan-Docs-Fakten: Registernamen, Kachelformat, Kartenadressierung beider Methoden, Ausschnitt mit Umbruch, OAM-Felder und Sichtbarkeit, Palette, Zeilenbreite 8/16, Diff |
| `tests/contract/` | `RequestSnapshot` nur an den eigenen Slot. Ausgeblendet ergibt 0 Lieferungen. Bedarf folgt der Sichtbarkeit. Views dispatchen nur `SetFrameRate`/`RequestSnapshot` (FR-002, FR-013, SC-004) |
| `tests/views/*.test.tsx` | Jeder View rendert die Werte aus einem Snapshot des passenden Test-ROMs. Markierung nach Änderung. „No ROM loaded“. Start-Rate „1/s“, Start-Palette „Raw“ |
| `tests/e2e/m1b-*.spec.ts` | Jeden der fünf Views über die Kopfleiste einstellen. Raten zählen (1/s ergibt höchstens 1 Neuzeichnung pro Sekunde). Pause zeigt den Pausenstand. Refresh. Sprung zu einer Adresse mit einer Neuzeichnung (SC-006). Zeilenbreite 8 im schmalen und 16 im breiten Slot. Keine Animation, Graustufen-Screenshot |

## Manuelle Prüfungen am Gerät

Ins Abnahmeprotokoll `docs/abnahme/m1b.md` gehören: Gerätemodell, Android- und Chrome-Version sowie die
Messdauer (Vorgabe aus der M1-Abnahme).

1. **Smartphone (SC-002)**:
   - Screen und Hex auf „Live“ nebeneinander, 5 Minuten spielen.
   - In ROM Info `frameWorkP95Ms` und `emulatedFps` ablesen.
   - Ziel: < 16,7 ms und ≥ 59 fps (research.md R12).
2. **Boox Palma (Hochformat, zwei Slots) und Boox Go Color 7 (SC-005)**:
   - Alle fünf Views nacheinander öffnen.
   - Prüfen: kein horizontales Scrollen, Hex-Zeilenbreite passend, Kacheln unterscheidbar.
   - Markierungen (geändert, ausgewählt, eingeblendete Bank, „gesperrt“) sind auf dem Display erkennbar.
3. **Live-Rate (Spec-Annahme)**: Auf beiden Boox-Geräten mit „Live“ prüfen, ob 10/s noch bedienbar ist.
   Das Ergebnis wird notiert.
