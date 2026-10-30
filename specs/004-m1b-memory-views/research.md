# Research: M1b – Speicher-Ansichten (nur lesen)

Grundlage: [spec.md](spec.md) inklusive Clarifications vom 2026-10-26. Alle Aussagen zum Core stammen aus
dem SameBoy-Quelltext am festen Commit `26a56bd6a122a6318a456abd80558408742d5adf` (lokal unter
`.build/sameboy/`, siehe `scripts/build-core.sh`). Hardware-Fakten stammen aus Pan Docs
(`gbdev/pandocs`, Stand Commit `8dc19b1`, 2026-09-14; CC0).

## R1 – Lesepfad im Core: direkter Zugriff statt `GB_safe_read_memory`

**Decision**: Alle Daten für die Speicher-Views liest der Wrapper über `GB_get_direct_access`
(`Core/gb.c:1839`) und wenige mit Kommentar markierte `GB_INTERNAL`-Felder. Der Pfad
`GB_safe_read_memory` / `dmg_peek` wird für Views nicht verwendet.

**Rationale**: `GB_safe_read_memory` (`Core/memory.c:823`) läuft durch die normalen Lesefunktionen und hat
deshalb Wirkungen, die mit den Anforderungen kollidieren:

| Stelle | Wirkung beim Lesen | Konflikt |
|---|---|---|
| `memory.c:546–552` (OAM) | `GB_display_sync`, liefert `$FF`, solange OAM gesperrt ist | Spec-Randfall „innerer Zustand“, FR-012 |
| `memory.c:471–499`, `623` (LCDC, STAT, SCY, SCX, LY, LYC, DMA, BGP, OBP0/1, WY, WX, IF …) | `sync_ppu_if_needed` → `GB_display_sync` | FR-012 (gleiche Ausgabe) |
| `memory.c:740–742` → `apu.c:1097–1099` (NR10 bis Wave-RAM) | `GB_apu_run(gb, true)` erzwingt Ton-Rendering zum Lesezeitpunkt | FR-012, SC-003 (gleiche Tonausgabe) |
| `memory.c:355ff` (Cartridge-RAM) | Inhalt nur bei freigegebenem RAM, sonst Ersatzwert | Clarification Q4 (Inhalt immer zeigen) |

`GB_get_direct_access` gibt dagegen reine Zeiger zurück, ohne den Core zu verändern: ROM, Cartridge-RAM
(alle Bänke plus aktuelle Bank), VRAM, WRAM, OAM, I/O, HRAM, IE.

**Alternatives considered**: `GB_safe_read_memory` je Adresse. Verworfen wegen der Tabelle oben. Eigene
Kopie des Speichers über den Schreib-Hook (`on_write`). Verworfen, weil DMA, PPU-Zustand und
I/O-Werte des Cores daran vorbeilaufen.

## R2 – Befund: M1 liest `changedMemory` bereits über den Pfad mit Nebenwirkung

**Decision**: Die erste Aufgabe von M1b ist ein Identitätstest gegen den **bestehenden** Code: 300 Frames
je Test-ROM, einmal ohne Abonnenten, einmal mit Snapshot-Aufbau in jedem Frame. Verglichen werden Bild
und alle Ton-Samples. Danach wird `changedRanges()` im Adapter auf den Lesepfad aus R1 umgestellt, und der
Test bleibt als Regressionstest (SC-003).

**Rationale**: `changedRanges()` (`sameboy-emulator.ts`) ruft `_dmg_peek` für jede geänderte 256-Byte-Seite
ab `$8000` auf. Die I/O-Seite `$FF00` ist fast in jedem Frame geändert. Damit hängen erzwungene PPU- und
APU-Syncs davon ab, ob und wie oft ein Snapshot gebaut wird (z. B. Screen im Normal- oder im E-Ink-Modus).
Die M1-Determinismus-Tests vergleichen nur Läufe mit gleichem Abonnement und decken das nicht ab. Ob die
Syncs die Ausgabe tatsächlich verändern, zeigt der Test, nicht eine Annahme.

**Ergebnis (T001, 2026-10-26)**: Keine beobachtbare Abweichung. Mit allen 19 Einträgen aus
`tests/roms/src/roms.json` (2 werden beim Laden abgelehnt und übersprungen) sind Bild und alle Ton-Samples
nach 300 Frames gleich, egal ob kein Snapshot oder einer pro Frame gebaut wird. Die Umstellung von
`changedRanges()` auf den direkten Lesepfad erfolgt trotzdem aus Prinzip (keine Abhängigkeit von
Core-Interna beim Lesen), der Test bleibt als Regressionstest.

**Alternatives considered**: Nur den neuen Pfad sauber bauen und M1 unverändert lassen. Verworfen, weil
SC-003 „mit und ohne Views gleiche Ausgabe“ dann vom Screen-Abonnement abhängen könnte.

## R3 – I/O-Bytes: roh aus `io_registers`, DIV aus `div_counter`

**Decision**: Der Bereich `$FF00–$FF7F` wird als Kopie von `io_registers` geliefert (direkter Zugriff
`GB_DIRECT_ACCESS_IO`). Einzige Korrektur: `DIV` wird aus `div_counter >> 8` gesetzt (`GB_INTERNAL`), weil
SameBoy DIV nicht in `io_registers` führt (`memory.c:674–675`). Weitere Abweichungen zwischen Rohwert und
CPU-Sicht werden nicht nachgebildet, und der Hex-View vermerkt im Bereich I/O: „Internal emulator values;
unused bits may differ from what the CPU reads.“

Bekannte Abweichungen (alle aus `memory.c:623–745`), die damit sichtbar bleiben:

| Register | CPU liest | Rohwert |
|---|---|---|
| IF, TAC, STAT | mit festen 1-Bits (`| 0xE0`, `| 0xF8`, `| 0x80`) | ohne diese Bits |
| TIMA während Reload | `0` | alter Wert |
| NR52 | aus Kanalzustand berechnet (`apu.c:1100ff`) | gespeichertes Byte |
| JOYP | gespeicherter Wert | gleich (JOYP ist bei `GB_safe_read_memory` schon roh) |
| Wave-RAM `$FF30–$FF3F` | bei aktivem Kanal 3 abhängig vom Lesezeitpunkt | gespeicherte Bytes (`apu.c:730ff`) |

**Rationale**: Spec-Randfall „innerer Zustand, nicht das, was die CPU in diesem Moment lesen würde“. Feste
1-Bits per Maske in eigenem Code nachzubauen wäre Hardware-Wissen aus dem Gedächtnis (Constitution X) und
gehört zur Bit-Aufschlüsselung in M4.

**Alternatives considered**: NR52 und die 1-Bits nachbilden. Verworfen (siehe oben, M4).

## R4 – Kopierkosten und Bedarf

**Decision**: Die Inspektionsdaten werden nur gebaut, solange mindestens ein sichtbarer Slot einen View
mit `inspects: true` zeigt (Bedarf wie `frame-demand.ts`). Pro gebautem Snapshot werden nur die
veränderlichen Bereiche kopiert. Das ROM wird einmal pro Ladevorgang kopiert und danach als dieselbe
Referenz weitergegeben.

**Rationale**: Spike im Codespace (Node 24, echtes `sameboy.wasm`, `HEAPU8.slice`, je 20 000
Wiederholungen):

| Kopierte Menge | Inhalt | Zeit pro Kopie |
|---|---|---|
| 24 864 Byte | VRAM + WRAM + OAM/I/O/HRAM, Cartridge-RAM 8 KiB | 4,9 µs |
| 49 440 Byte | dasselbe mit 32 KiB Cartridge-RAM | 8,9 µs |
| 147 744 Byte | dasselbe mit 128 KiB Cartridge-RAM (MBC5-Maximum) | 25,2 µs |

Das sind auch auf einem 5–10× langsameren Gerät unter 0,3 ms von 16,7 ms. Weil der Hub bei sichtbarem
Screen jeden Frame baut, würde ein ständiges Mitkopieren aber 3–9 MB Müll pro Sekunde erzeugen, auch ohne
Speicher-View. Der Bedarf hält M1 unverändert.

**Alternatives considered**: Immer mitkopieren. Einfacher, aber zusätzlicher Speicherdruck auf
schwachen Geräten ohne Nutzen. Pro-Slot-Zeitplan im Hub (nur in Frames kopieren, die ein Speicher-Slot
wirklich bekommt). Verworfen, weil die Slots ihre Drosselung selbst zählen und der Hub sie nicht kennt.
Lazy Reader, der beim Rendern live aus dem Emulator liest. Verworfen: Bis React rendert, sind weitere
Frames gelaufen, und Register und Speicher würden nicht zusammenpassen.

## R5 – Vertrag: typisierte Erweiterung des Frame-Zustands, kein dritter Kanal

**Decision**: `FrameSnapshot` erhält das Feld `inspection: InspectionSnapshot | null` (Details:
[contracts/frame-state.md](contracts/frame-state.md)). `null` heißt: kein Bedarf angemeldet. Neue
`ViewAction` `RequestSnapshot` (pro Slot, wie `SetFrameRate`). `ViewDefinition` erhält `inspects?: true`.
Festgehalten als Nachtrag zu ADR-0008.

**Rationale**: Constitution IV erlaubt genau zwei Kanäle. Speicher gehört zum Zustand eines Frames und muss
mit den Registern desselben Frames zusammenpassen. Eine typisierte Ergänzung ist laut FR-003 erlaubt.

**Alternatives considered**: Eigener `MemorySource` im `ViewContext` mit Lesefunktion. Verworfen: dritter
Kanal, und Views würden direkt in den Emulator greifen (Constitution II).

## R6 – Pause, Halt, Laden und Reset: Einzel-Snapshot

**Decision**:
1. Der Hub bekommt `prime(build)`. Der Adapter ruft es nach `loadRom`, `reset` und beim Halt auf. Damit
   kann `requestSnapshot()` auch vor dem ersten Frame den aktuellen Stand liefern.
2. Ein Speicher-View fordert über `RequestSnapshot` genau einen Snapshot an:
   - beim Einhängen,
   - wenn er wieder sichtbar wird,
   - bei `RunStateChanged` nach `paused`, `halted` oder `empty`,
   - bei `RomLoaded`,
   - bei `EmulatorReset` (neu, siehe unten).
3. Die Header-Aktion „Refresh“ löst ebenfalls `RequestSnapshot` aus.
4. Der Hub bündelt Anforderungen aus demselben Task zu einem Bau. Der Hub kennzeichnet Lieferungen auf
   Anforderung (`getDeliveryKind()`), und Slots ohne Anforderung ignorieren sie. Ein Vergleich der
   Frame-Nummer scheidet aus, weil sie nach Laden und Reset wieder bei 0 beginnt (Befund F1). So zählen Anforderungen nicht als Frames für gedrosselte
   Slots (SC-004), und der Screen zeichnet nicht unnötig neu. Heute ruft `requestSnapshot()` im Hub
   `deliver` für alle Abonnenten auf. Ein 1/s-Slot würde dabei weiterzählen (`slot-frame-source.ts`,
   `onUpstream`).

**Rationale**: Ohne das zeigt ein View auf „1 pro Sekunde“ beim Pausieren bis zu einer Sekunde alten
Stand (Konflikt mit FR-010). Ein im pausierten Zustand eingehängter View zeigt dann gar nichts, und nach
Laden oder Reset im Pausenzustand bleibt der alte Stand stehen (Spec-Randfall).

**Geprüft**: Der Session-Reset (`emulator-session.ts`, `case 'Reset'`) löst bei laufendem Emulator kein
Ereignis aus. `setRunState` veröffentlicht nur bei einem Wechsel. Deshalb wird die Union um
`{ type: 'EmulatorReset' }` erweitert. Die Session veröffentlicht es nach `emulator.reset()`.

## R7 – Aktualisierungsraten auf Frame-Basis

**Decision**:

| Stufe in der UI | `PublishRate` im Slot |
|---|---|
| „Live“ | `reduced`, `everyNthFrame = 6` (≈ 10/s bei 59,7 fps) |
| „1/s“ (Startwert, Clarification Q2) | `reduced`, `everyNthFrame = 60` |
| „Manual“ (nur auf Anforderung) | `on-demand` |

Die Rate liegt im View-Zustand des Slots, wird also mit dem Layout gespeichert (FR-010).

**Rationale**: Nutzt die vorhandene Pro-Slot-Drosselung (`slot-frame-source.ts`), ist deterministisch
testbar (SC-004 per Frame-Zählung). Bei voller Geschwindigkeit sind 60 Frames ≈ 1,005 s, also „höchstens
einmal pro Sekunde“.

**Alternatives considered**: Zeitbasierte Drosselung (`performance.now`). Schwerer zu testen, und bei
langsamer Emulation zeigt sie nichts Neues.

## R8 – Änderungsmarkierung durch Vergleich im View

**Decision**: Jeder Speicher-View merkt sich die Werte, die er zuletzt angezeigt hat (nur den sichtbaren
Ausschnitt), und markiert Abweichungen beim nächsten Snapshot. `FrameSnapshot.changedMemory` wird dafür
nicht verwendet.

**Rationale**: Der Adapter löscht die Dirty-Seiten bei jedem gebauten Snapshot. Bei sichtbarem Screen
wird jeder Frame gebaut, also sähe ein „1/s“-View nur die Änderungen des letzten Frames. FR-011 verlangt
aber „seit der letzten Aktualisierung des Views“.

## R9 – Fakten aus Pan Docs

Quelle jeweils `gbdev/pandocs`, Commit `8dc19b1`. Die Umsetzung legt sie als Konstanten mit
Quellenkommentar ab und testet sie gegen Test-ROMs (FR-016).

- **Register-Kurznamen** (`Hardware_Reg_List.md`): Für den DMG gelten alle Zeilen mit Modell „All“ oder
  „DMG“. Das sind 43 Einträge im I/O-Bereich von `$FF00` bis `$FF50`:
  - `P1/JOYP`, `SB`, `SC`, `DIV`, `TIMA`, `TMA`, `TAC`, `IF`
  - `NR10`–`NR14`, `NR21`–`NR24`, `NR30`–`NR34`, `NR41`–`NR44`, `NR50`–`NR52`
  - `Wave RAM` (`$FF30–$FF3F`)
  - `LCDC`, `STAT`, `SCY`, `SCX`, `LY`, `LYC`, `DMA`, `BGP`, `OBP0`, `OBP1`, `WY`, `WX`
  - `BANK` (`$FF50`)

  `IE` (`$FFFF`) steht in einem eigenen Bereich. Zeilen mit Modell „CGB“ bekommen keinen Namen.
- **LCDC** (`LCDC.md`):
  - Bit 6: Fenster-Karte (`0` = `$9800`, `1` = `$9C00`)
  - Bit 5: Fenster an
  - Bit 4: Kachel-Adressierung (`0` = `$8800`-Methode mit Basis `$9000` und vorzeichenbehafteten
    Nummern, `1` = `$8000` unsigned)
  - Bit 3: BG-Karte
  - Bit 2: OBJ-Größe
  - Bit 0: BG/Fenster an (DMG)
- **Kacheln** (`Tile_Data.md`): 384 Kacheln in drei Blöcken zu 128 ab `$8000`, `$8800` und `$9000`.
  16 Byte pro Kachel, zwei Bytes je Zeile, Bit 7 ist das linke Pixel.
- **Karten** (`Tile_Maps.md`, `Scrolling.md`):
  - 32 × 32 Einträge bei `$9800` und `$9C00`.
  - Der Ausschnitt beginnt bei (SCX, SCY) und bricht am Rand um.
  - Die Fensterecke liegt auf dem Bildschirm bei (WX − 7, WY).
- **OAM** (`OAM.md`):
  - 40 Einträge zu 4 Byte.
  - Y = Bildschirmposition + 16, X = Bildschirmposition + 8.
  - Im 8×16-Modus ist die obere Kachel `NN & $FE` und die untere `NN | $01`.
  - Attributbits: 7 Priorität, 6 Y-Flip, 5 X-Flip, 4 DMG-Palette (OBP0/OBP1).
  - „Nicht sichtbar“ heißt, dass das Objekt keine Zeile oder Spalte des 160 × 144-Bildschirms schneidet.
    Berechnet wird das aus Y − 16, X − 8 und der Höhe 8 bzw. 16.

## R10 – IME und HALT

**Decision**: Beide sind über `GB_INTERNAL` lesbar (`gb->ime`, `gb->halted`, `Core/gb.h:375`, `383`) und
werden in `InspectionSnapshot.cpu` mitgeliefert. Der View „Registers“ zeigt sie an (Entscheidung des
Projektinhabers 2026-10-26, FR-006 ergänzt).

## R11 – Cartridge-RAM

**Decision**: Der Wrapper liefert:
- `mbc_ram` mit Größe `mbc_ram_size`, also alle Bänke zu 8 KiB,
- die aktuelle Bank (aus `GB_get_direct_access`),
- `mbc_ram_enable` (`GB_INTERNAL`, `gb.h:426`) als „gesperrt“-Kennzeichen.

Bei Modulen ohne MBC entfällt das Kennzeichen.

**Geprüft (T019)**:
- **MBC2**: `mbc_ram_size = 0x200` (`Core/mbc.c:212`). Jedes Byte hält ein 4-Bit-Wert, die CPU liest es
  mit gesetzten oberen Bits (`memory.c:455–456`, `ret |= 0xF0`) und gespiegelt über `$A000–$BFFF`
  (`& (mbc_ram_size - 1)`, `memory.c:454`). Der Snapshot liefert die 512 Rohbytes als eine Bank.
- **MBC3 mit RTC**: Die Uhrregister liegen nicht in `mbc_ram`. Ist ein RTC-Register eingeblendet
  (`mbc3.rtc_mapped`, `memory.c:414`), liefert die CPU nicht RAM. Der Snapshot zeigt nur die RAM-Bänke;
  die Bank wird wie im Core auf die vorhandenen Bänke begrenzt. RTC-Register zeigt M1b nicht.
- **MBC7**: `mbc_ram_size = 0x100` (`mbc.c:215`), EEPROM, nur roh gezeigt.
- **Direkter Zugriff und Bank**: `GB_get_direct_access` maskiert die RAM-Bank mit `mbc_ram_size / 0x2000 - 1`,
  das ist bei MBC2 0 − 1. Der Wrapper liest deshalb `mbc_ram_bank` direkt (`GB_INTERNAL`).
- **Test-ROM**: Für den Test wird ein neues ROM mit MBC5 und 4 RAM-Bänken gebaut. Das vorhandene
  `mbc5-battery` hat nur eine Bank.

## R12 – Messung für SC-002

**Decision**: Die bestehende Kennzahl `frameTimeP95Ms` misst nur `_dmg_run_frame`. Snapshot-Aufbau und
Rendering liegen außerhalb, damit könnte SC-002 nie scheitern. Neu kommen zwei Diagnosewerte in ROM Info
dazu:
1. `frameWorkP95Ms`: Emulation plus `offer()`, also Snapshot-Aufbau und Benachrichtigung der Abonnenten.
2. `emulatedFps`: tatsächlich emulierte Frames pro Sekunde über die letzte Minute. Er erfasst auch die
   Hauptthread-Last durch React-Rendering.

SC-002 gilt als erfüllt (Entscheidung des Projektinhabers 2026-10-26, Spec angepasst), wenn `frameWorkP95Ms` < 16,7 ms und `emulatedFps` ≥ 59 bei Screen plus einem
Speicher-View auf „Live“. Die bestehende Kennzahl bleibt für den Vergleich mit M1 erhalten.

**Alternatives considered**: Nur `frameTimeP95Ms`. Verworfen, weil nicht aussagekräftig.

## R13 – I/O-Bereich als Registerliste (Umsetzung US1)

**Decision**: Im Bereich I/O zeigt der Hex-View eine Adresse pro Zeile mit Wert und Kurzname
(`$FF40 91 LCDC`). Die Zeilenbreite 8/16 aus FR-005 gilt für alle anderen Bereiche. Vom Projektinhaber am
2026-10-26 bestätigt, FR-005 um die Ausnahme ergänzt.

**Rationale**: US1-AS7 verlangt den Namen neben jeder belegten Adresse. In einer 8- oder 16-Byte-Zeile
ist dafür kein Platz, ohne auf dem Palma horizontal zu scrollen. 128 Einträge sind mit Blättern schnell
durchgesehen.

## Offene Punkte

1. ~~R11: Belegung von MBC2- und MBC3-RTC im `mbc_ram`.~~ Geprüft (T019).
2. ~~R2: Ergebnis des Identitätstests gegen den M1-Code.~~ Keine Abweichung, notiert in R2 und `docs/abnahme/m1b.md` (T001).
3. ~~Bestehende Tests, die `changedMemory` auswerten (`tests/emulator/sameboy-adapter.test.ts`,
   `service-contract.test.ts`), werden bei der Umstellung aus R2 gezielt angepasst. VRAM und OAM
   liefern dann den inneren Zustand statt `$FF` während der LCD-Sperre.~~ Erledigt in T018; die Tests prüfen keine betroffenen Werte, ergänzt um den Ausschluss von Echo-RAM und `$FEA0–$FEFF`.
4. ~~Live-Rate 10/s am Gerät prüfen (Spec-Annahme).~~ Nicht geprüft, Verzicht des Projektinhabers (`docs/abnahme/m1b.md`).
