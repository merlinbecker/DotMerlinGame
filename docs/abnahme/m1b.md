# Abnahme M1b – Speicher-Ansichten (nur lesen)

Stand: 2026-10-26 · Branch `feature/firstSteps` · **Gerätetests offen, noch nicht abgenommen** (Version 0.3.14) ·
Grundlage: [quickstart.md](../../specs/004-m1b-memory-views/quickstart.md)

## Automatische Prüfung

Lokal im Codespace, Node v24, `npm run check` (identisch zum CI-Job `check`) und `npm run core:verify`:

| Stufe | Ergebnis |
|---|---|
| Lint (ESLint inkl. Architekturregeln, Stylelint) | grün |
| Typprüfung | grün |
| Vitest | 601 bestanden, 1 ausstehend (`it.todo` Roundtrip, M3) |
| Nachbau Boot-ROM und Logo-Hash (`git diff`) | identisch |
| Build | grün |
| Abnahmetests Chromium | 56 bestanden |
| Lizenz-Check | bestanden, keine neue Fremdkomponente |
| Secret-Scan | bestanden |
| Core-Nachbau mit neuen Wrapper-Funktionen (`npm run core:verify`, Docker) | byte-identisch |

**Befund vor der Umsetzung (T001, research.md R2)**: Der M1-Pfad für `changedMemory` las über
`GB_safe_read_memory`. Ein Vergleich über 300 Frames je Test-ROM mit und ohne Snapshot-Aufbau zeigte keine
Abweichung. Der Pfad wurde trotzdem auf direkten Lesezugriff umgestellt.

## Abnahmekriterien

| Kriterium | Nachweis | Status |
|---|---|---|
| Fünf Views über die Kopfleiste in jedem Slot (FR-001) | `tests/unit/layout-store.test.ts` (Reihenfolge), `tests/e2e/m1b-*.spec.ts` | ✅ automatisch |
| Nur lesen, nur über den View-Vertrag (FR-002, FR-003) | `tests/support/dispatch-spy.ts` in jedem View-Test (nur `SetFrameRate`/`RequestSnapshot`), ESLint-Regel gegen Adapter-Importe, Typ-Tests in `tests/contract/` | ✅ automatisch |
| Hex: alle Bereiche, jede ROM- und RAM-Bank, „mapped“/„locked“, Registernamen, Sprung, Blättern, 8/16 Bytes (FR-004, FR-005, US1) | `tests/unit/inspect-areas`, `inspect-io-registers`, `inspect-hex-layout`, `view-hex`, `tests/e2e/m1b-hex.spec.ts` | ✅ automatisch |
| Registers inkl. Flags, IME, HALT (FR-006, US2) | `tests/unit/view-registers.test.tsx`, `tests/emulator/inspection.test.ts`, `tests/e2e/m1b-registers.spec.ts` | ✅ automatisch |
| Tiles, Tilemaps, Sprites pixel- bzw. feldgenau, Schalter Raw/Palette (FR-007–FR-009, US3–US5) | `tests/unit/inspect-tiles`, `inspect-tilemap`, `inspect-oam`, `view-tiles`, `view-tilemaps`, `view-sprites`, `tests/e2e/m1b-tiles`, `m1b-tilemaps`, `m1b-sprites` | ✅ automatisch |
| Werte stimmen mit den Test-ROMs überein (SC-001, FR-016) | `tests/emulator/inspection.test.ts` und View-Tests mit echten Snapshots von `inspect-mem`, `inspect-regs(-halted)`, `inspect-gfx(-tall)` | ✅ automatisch |
| Raten Live/1/s/Manual, Start 1/s, gespeichert, Pause zeigt Pausenstand, auch nach Wiedereinblenden (FR-010, SC-004, US6) | `tests/unit/inspect-rate`, `view-use-inspection`, `slot-frame-source`, `tests/contract/slot-view.test.tsx`, `tests/e2e/m1b-rates.spec.ts`, `m1b-pause.spec.ts` | ✅ automatisch |
| Änderungen invertiert, Auswahl umrahmt, ohne Farbe (FR-011, US6-AS5) | View-Tests, `tests/e2e/m1b-eink.spec.ts` | ✅ automatisch |
| Gleiche Bild- und Tonausgabe mit und ohne Views (FR-012, SC-003) | `tests/emulator/inspection-identity.test.ts` (alle Test-ROMs, 300 Frames, mit und ohne Inspektion) | ✅ automatisch |
| Ausgeblendete Views: 0 Updates (FR-013) | `tests/unit/slot-frame-source.test.ts`, `tests/e2e/m1b-rates.spec.ts` | ✅ automatisch |
| E-Ink-Regeln: keine Bewegung, nur Graustufen (FR-014) | `tests/e2e/m1b-eink.spec.ts` | ✅ automatisch |
| Hinweis ohne ROM (FR-015) | View-Tests | ✅ automatisch |
| Sprung zur Adresse mit einer Neuzeichnung (SC-006) | `tests/unit/view-hex.test.tsx` | ✅ automatisch |
| Kein horizontales Scrollen im schmalen Slot (Randfall, SC-005) | `tests/e2e/m1b-eink.spec.ts` mit angenähertem Palma-Viewport. Der Test findet Scrollbalken, aber keinen abgeschnittenen Inhalt in Containern mit `overflow: hidden`; das deckt nur der Gerätetest ab | ⏳ teilweise automatisch, Gerät offen |
| Leistung: `frameWorkP95Ms` < 16,7 ms und `emulatedFps` ≥ 59 mit Screen + Hex auf „Live“ (SC-002) | Gerätetest | ⏳ offen |
| Lesbar und bedienbar auf Boox Palma und Boox Go Color 7 (SC-005) | Gerätetest | ⏳ offen |
| Live-Rate 10/s auf E-Ink bedienbar (Spec-Annahme) | Gerätetest | ⏳ offen |

## Gerätetests (offen)

Zu notieren je Gerät: Modell, Android- und Chrome-Version, Messdauer, CSS-Viewport (`innerWidth` ×
`innerHeight`, `devicePixelRatio`) für T046/T068.

| Gerät | Modell / Android / Chrome | Viewport | Messdauer | Ergebnis |
|---|---|---|---|---|
| Smartphone (SC-002) | | | | |
| Boox Palma (SC-005) | | | | |
| Boox Go Color 7 (SC-005) | | | | |
