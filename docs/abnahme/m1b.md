# Abnahme M1b – Speicher-Ansichten (nur lesen)

Stand: 2026-10-30 · Branch `feature/firstSteps` · **M1b abgeschlossen ohne vollständige Gerätetests, Version 0.4.0** ·
Grundlage: [quickstart.md](../../specs/004-m1b-memory-views/quickstart.md)

## Automatische Prüfung

Lokal im Codespace, Node v24, `npm run check` (identisch zum CI-Job `check`) und `npm run core:verify`.
Geprüft auf dem Stand von Version 0.3.16. Der Core-Nachbau stammt von Version 0.3.14 und wurde nicht wiederholt, der Core ist seitdem unverändert:

| Stufe | Ergebnis |
|---|---|
| Lint (ESLint inkl. Architekturregeln, Stylelint) | grün |
| Typprüfung | grün |
| Vitest | 601 bestanden, 1 ausstehend (`it.todo` Roundtrip, M3) |
| Nachbau Boot-ROM und Logo-Hash (`git diff`) | identisch |
| Build | grün |
| Abnahmetests Chromium | 59 bestanden |
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
| Kein horizontales Scrollen im schmalen Slot (Randfall, SC-005) | `tests/e2e/m1b-eink.spec.ts` mit angenähertem Palma-Viewport. Der Test findet Scrollbalken, aber keinen abgeschnittenen Inhalt in Containern mit `overflow: hidden`; das deckt nur der Gerätetest ab | ⚠️ automatisch; am Gerät ohne Protokollwerte, siehe unten |
| Leistung: `frameWorkP95Ms` < 16,7 ms und `emulatedFps` ≥ 59 mit Screen + Hex auf „Live“ (SC-002) | Nicht auf dem Smartphone gemessen | ⚠️ Verzicht des Projektinhabers |
| Lesbar und bedienbar auf Boox Palma und Boox Go Color 7 (SC-005) | Sichtprüfung des Projektinhabers, siehe unten | ⚠️ teilweise |
| Live-Rate 10/s auf E-Ink bedienbar (Spec-Annahme) | Nicht gezielt geprüft | ⚠️ Verzicht des Projektinhabers |

## Anleitung für die Gerätetests

Getestet wird der Produktions-Build auf Replit, Branch `main` (arc42 7.4). Vorher prüfen, dass in der App
unten `v0.4.0` oder neuer steht, und den angezeigten Commit-Hash je Gerät in der Tabelle notieren. Zum Laden
braucht man ein eigenes oder frei lizenziertes Homebrew-`.gb`, z. B. die Test-ROMs aus `tests/roms/build/`.

### Was die App in diesem Stand kann

- **Raster:** Der Inhalt eines Quadrats wechselt über die Pfeile in seiner Kopfleiste. Zoom geht nur
  über den Schalter in der Kopfleiste. Die Belegung wird gespeichert.
- **Emulator:** `.gb` laden und spielen (ohne MBC, MBC1, MBC3, MBC5).
  - Start mit eigener Boot-ROM oder direkt.
  - Steuerung über Touch-Controller, Tastatur (WASD, J/K, Enter/Leertaste) oder Gamepad.
  - Spielstand wird gespeichert, Neustart aus dem Speicher möglich. CGB-only-ROMs werden abgelehnt.
- **Ton:** vier Kanäle, Stumm und Lautstärke.
- **E-Ink-Modus:** Bildrate, Grauwert-Zuordnung und Dithering.
- **ROM Info und Memory Map:** ROM Info zeigt jetzt auch `frame-work` (Arbeit pro Frame, p95) und
  `emulated-fps`.
- **Neu in M1b, fünf nur lesende Ansichten:**
  - **Hex:** ROM pro Bank, VRAM, WRAM, Cartridge-RAM pro Bank, OAM, I/O mit Registernamen, HRAM. Mit
    Sprung zu einer Adresse und Blättern, 8 oder 16 Bytes pro Zeile.
  - **Registers:** CPU-Register, Flags, IME und HALT.
  - **Tiles:** 384 Kacheln, umschaltbar zwischen Rohwerten und Palette.
  - **Tilemaps:** Hintergrund und Fenster.
  - **Sprites:** 40 OAM-Einträge mit allen Feldern.
  - Alle fünf haben die Raten Live, 1/s und Manual (Start mit 1/s). Änderungen werden invertiert
    angezeigt, die Auswahl bekommt einen Rahmen, beides ohne Farbe.

### 1. Smartphone (SC-002)

1. ROM laden. Zwei Quadrate belegen: Screen und Hex mit Rate **Live**.
2. 5 Minuten spielen. Dann in ROM Info `frame-work` und `emulated-fps` ablesen.
   - Ziel: `frame-work` unter 16,7 ms, `emulated-fps` mindestens 59.
3. Notieren: Modell, Android- und Chrome-Version, Messdauer, `innerWidth` × `innerHeight` und
   `devicePixelRatio`.

### 2. Boox Palma und Boox Go Color 7 (SC-005)

1. Jede der fünf Ansichten einmal im schmalen und einmal im gezoomten Quadrat öffnen.
   - Ist alles lesbar?
   - Wird etwas abgeschnitten, oder gibt es seitliches Scrollen?
2. Hex: zu `FF40` springen und blättern. Im I/O-Bereich stehen Zeilen wie `$FF40 91 LCDC`. Die
   Zeilenbreite passt zum Quadrat (8 oder 16 Bytes, ohne Abschneiden).
3. Tiles: zwischen Rohwerten und Palette umschalten.
4. Markierungen auf dem Display prüfen, alle ohne Farbe erkennbar:
   - geändert (invertiert)
   - ausgewählt (Rahmen)
   - eingeblendete Bank („mapped“)
   - gesperrter RAM („locked“, im ROM `inspect-mem`)
5. Rate **Live**:
   - Lässt sie sich noch bedienen, oder flackert es zu stark?
   - Danach **1/s** und **Manual** mit Refresh ausprobieren.
6. Pause: Die Ansichten bleiben auf dem Pausenstand stehen.
7. Viewport notieren wie beim Smartphone.

### 3. Schnellcheck auf allen Geräten

- Der Commit-Hash ist sichtbar.
- Nach dem Neuladen bleiben die Belegung der Quadrate und die gewählten Raten erhalten.
- Ohne geladenes ROM zeigen die Ansichten einen Hinweis statt eines Fehlers.

## Abschluss ohne vollständige Gerätetests

Der Projektinhaber hat am 2026-10-30 entschieden, M1b ohne die restlichen Gerätetests abzuschließen, weil
die Änderungen danach klein waren. Die Anleitung oben bleibt für einen späteren Test gültig.

**Rückmeldung des Projektinhabers** (Boox Palma und Boox Go Color 7, vor den Korrekturen in 0.3.16):

- Alle fünf Ansichten sind sichtbar, Tiles usw. werden angezeigt, die Navigation ist gut.
- Die Werte in ROM Info liegen im Rahmen der Vorgabe. Zahlen wurden nicht notiert.
- Der Hex-View war im kleinen Quadrat nicht nutzbar, weil keine Bytes zu sehen waren.
- ROMs ließen sich teils nicht laden, es passierte nichts.
- Nach einem Fokuswechsel von Chrome ließ sich ein geladenes ROM gefühlt nicht mehr aktivieren.

**Korrekturen in 0.3.16** (automatisch getestet, nicht am Gerät):

- Hex-View: Bedienelemente kompakter, mindestens 2 Bytezeilen bei 360 × 640.
- Ein ROM startet auch, wenn das vorherige wegen der Hardware-Prüfung angehalten wurde.
- Der ROM-Speicher öffnet die IndexedDB-Verbindung neu, wenn sie geschlossen wurde. Dass Chrome das auf dem
  Boox wirklich tut, ist nicht belegt.

**Nicht nachgewiesen:**

- SC-002 auf dem Smartphone (`frame-work`, `emulated-fps`) und die Live-Rate 10/s auf E-Ink.
- SC-005 mit Modell, Chrome-Version und Viewport. Die E2E-Tests nutzen weiter den angenäherten Palma-Viewport.
- Die Ursache des Fokus-Problems und die Wirksamkeit der Korrekturen am Gerät.

| Gerät | Build-Hash | Modell / Android / Chrome | Viewport | Messdauer | Ergebnis |
|---|---|---|---|---|---|
| Smartphone (SC-002) | – | – | – | – | nicht getestet |
| Boox Palma (SC-005) | nicht notiert | nicht notiert | nicht notiert | – | siehe Rückmeldung |
| Boox Go Color 7 (SC-005) | nicht notiert | nicht notiert | nicht notiert | – | siehe Rückmeldung |
