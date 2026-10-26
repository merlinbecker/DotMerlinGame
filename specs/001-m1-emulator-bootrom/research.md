# Research: M1 – Emulator-Kern und eigene Boot-ROM

**Stand**: 2026-10-18. Lizenzen anhand der LICENSE-Dateien der Repos gelesen (GitHub-API), Machbarkeit
per Spike im Scratchpad geprüft (nicht im Repo): SameBoy und binjgb mit Emscripten nach WASM gebaut und
mit einem selbst erzeugten Test-ROM in Node ausgeführt. Hardware-Werte aus Pan Docs
(`gbdev/pandocs`, Lizenz CC0-1.0), Seite „Power Up Sequence“.

Entscheidungen des Projektinhabers vom 2026-10-18 sind mit **(PI)** markiert.

## R1 – Emulator-Core (ADR-0006) **(PI)**

**Decision**: **SameBoy**, nur das Verzeichnis `Core/`, Commit
`26a56bd6a122a6318a456abd80558408742d5adf` (Release v1.0.4 vom 2026-10-09), Modell `GB_MODEL_DMG_B`.
In M1 gebaut **ohne** Debugger, Rewind und Cheats (`GB_DISABLE_DEBUGGER`, `GB_DISABLE_REWIND`,
`GB_DISABLE_CHEATS`, `GB_DISABLE_CHEAT_SEARCH`, `GB_DISABLE_TIMEKEEPING`). Nicht gebaut und nicht
ausgeliefert: `BootROMs/`, `iOS/`, `HexFiend/`, alle Frontends.

**Rationale** (Spike-Messwerte, Node 24 im Codespace, 600 Frames):

| Kriterium | SameBoy (ohne Debugger) | SameBoy (mit Debugger) | binjgb `1662111` |
|---|---|---|---|
| Lizenz (LICENSE-Datei) | Expat für alles außer `iOS/`, `HexFiend/` | dto. | MIT |
| Kompiliert mit Emscripten 6.0.11 | ja | ja (braucht dann Rewind + Cheats) | ja |
| `.wasm` gzip | 72 KB | 99 KB | 32 KB |
| ms pro Frame | 0,88 | 1,06 | 0,38 |
| Boot-ROM einblenden bis `$FF50` | nativ, mit eigenem Stub belegt | nativ | fehlt (Core-Patch nötig) |
| Echter Einschaltzustand vor der Boot-ROM | ja | ja | nein, startet im Nach-Boot-Zustand |
| Direktstart | eigene Wrapper-Funktion (belegt) | dto. | nativ |
| Schreib-Hook (für `changedMemory`) | `GB_set_write_memory_callback` (belegt) | dto. | nein |
| Lese-Hook (Watchpoints M4) | `GB_set_read_memory_callback` (belegt) | dto. | nein |
| Ausführungs-Hook (Breakpoints/Step M4) | `GB_set_execution_callback` (belegt) | dto., zusätzlich eingebauter Debugger (befehlsbasiert) | eingebaute Breakpoints mit Bank, `emulator_step` (nicht im Spike geprüft) |
| Ton, Kanal stumm | `GB_apu_set_sample_callback`, `GB_set_channel_muted` | dto. | ja |
| ROM-Bank abfragen | `GB_get_direct_access(…, &bank)` | dto. | ja |
| Batterie-RAM | `GB_save_battery_to_buffer` / `GB_load_battery_from_buffer` | dto. | ja |
| Determinismus | mit `GB_random_seed` belegt (gleicher RAM, gleiches Bild) | dto. | nicht geprüft |
| Pflege | letzter Commit 2026-10-13 | | letzter Commit 2026-09-25 |

Die Hooks wurden im Build **ohne** Debugger gemessen (60 Frames: 117.043 Schreib-, 351.123
Ausführungs- und 819.282 Lese-Callbacks). Für M4 reichen sie, um Breakpoints, Step und Watchpoints selbst
umzusetzen, ohne SameBoys befehlsbasierten Debugger einzubinden (FR-014: Vergleich der Debug-Hooks).

Ausschlaggebend ist die eigene Boot-ROM: SameBoy führt immer echte Boot-ROMs aus und bildet deshalb
den Einschaltzustand nach. Bei binjgb müssten Boot-ROM-Mapping **und** Einschaltwerte von CPU, PPU,
APU und Timer selbst in den Core gepatcht werden. Genau dort entstünden schwer auffindbare
Abweichungen. Das Zeitbudget von 16,7 ms pro Frame wird von allen Kandidaten weit unterschritten.
SC-003 muss trotzdem auf dem Gerät gemessen werden.

**Alternatives considered**: binjgb (siehe Tabelle); wasmboy (GPL-3.0 laut GitHub, ausgeschlossen);
mGBA (MPL-2.0, schwaches Copyleft, nicht in der Freigabeliste); Gambatte (GPL, laut Briefing
ausgeschlossen); eigener Core (Aufwand außerhalb von M1).

## R2 – WASM-Build und Herkunftsnachweis (ADR-0006, arc42 Kap. 7/8) **(PI: Option A)**

**Decision**: Das Artefakt wird committet und in der CI nachgebaut.

- Skript `scripts/build-core.sh`. Es klont SameBoy zum festen Commit in einen **festen Pfad**
  (`/work/.build/sameboy` im Container; zufällige Pfade könnten über `__FILE__` ins Artefakt gelangen) und
  kompiliert `Core/*.c` (Liste im Skript) plus unseren Wrapper `src/adapters/emulator/sameboy/wrapper.c`
  im Docker-Image `emscripten/emsdk@sha256:cdefec943f04fd4b2b2fe23b0a1a346be9fc560ef5784a83faa27dd351381372`
  (Tag 6.0.11). Fester Mount-Pfad im Container: `/work`.
- Flags: `-O3 -std=gnu11 -D_GNU_SOURCE -DGB_INTERNAL` plus die Disable-Flags aus R1,
  `-DGB_VERSION="<SameBoy-Commit>"`, `-s MODULARIZE=1 -s EXPORT_ES6=1 -s ENVIRONMENT=web,node`
  (Node für Vitest), `-s FILESYSTEM=0 -s ALLOW_MEMORY_GROWTH=1 -s EXIT_RUNTIME=0` und eine explizite
  Exportliste.
- Ausgabe nach `src/adapters/emulator/sameboy/generated/` (`sameboy.mjs`, `sameboy.wasm`) zusammen mit
  `BUILD-INFO.json` (SameBoy-Commit, Image-Digest, Flags, SHA-256 der Ausgaben).
- CI-Job `core-reproducible` (getrennt vom Job `check`) führt das Skript aus und schlägt bei
  `git diff --exit-code -- src/adapters/emulator/sameboy/generated` fehl. Lokal: `npm run core:verify`.
  **(PI)**: `npm run check` bleibt ohne Docker. Der Satz „genau wie die CI“ in `CLAUDE.md` und arc42
  erhält den Zusatz „außer dem Core-Nachbau“.
- Spike-Beleg: Zwei Builds mit leerem Emscripten-Cache waren byte-identisch (`.wasm` und `.js`), allerdings
  auf **einer** Maschine. Schritt 1 gilt erst als erledigt, wenn der erste CI-Lauf von `core-reproducible`
  dasselbe Artefakt wie der lokale Build erzeugt hat.

**Rationale**: `npm run dev`/`build` brauchen kein emsdk. Die Herkunft des Binärartefakts ist trotzdem
jederzeit prüfbar. Ein Update ist nur bewusst möglich (Commit im Skript ändern, neu bauen, `third_party/`
anpassen).

**Alternatives considered**: nur CI-Build (alle Entwickler bräuchten Docker); nur Artefakt (Herkunft
ungeprüft); binjgbs vorgebautes `docs/binjgb.wasm` (Commit und Flags unbekannt).

## R3 – Lizenzen der ausgelieferten Teile

**Decision**:

- SameBoy `Core/`: Expat (Copyright (c) 2015-2026 Lior Halphon). Die Zusatzbedingung gilt nur für
  `iOS/`, das wir nicht verwenden. Die Suche in `Core/` fand keine abweichenden Lizenzköpfe.
- Emscripten-Laufzeit (JS-Glue und System-Bibliotheken im `.wasm`): Emscripten selbst steht unter MIT
  oder University of Illinois/NCSA (LICENSE). Die mitgelieferte musl libc steht laut Emscripten-LICENSE
  unter MIT. **Offener Punkt bei der Übernahme**: Welche System-Bibliotheken tatsächlich gelinkt werden
  (z. B. compiler-rt, malloc), wird aus der verbose Link-Ausgabe ermittelt. Deren LICENSE-Dateien werden
  im festgelegten Image gelesen und eingetragen.
- Einträge: `third_party/sameboy.md`, `third_party/emscripten.md`, Lizenztexte in `THIRD_PARTY_LICENSES`,
  im selben Commit wie das Artefakt.
- `THIRD_PARTY_LICENSES` wird nach `dist/` kopiert und ist aus der App erreichbar, weil das `.wasm` an
  jeden Browser verteilt wird.
- `scripts/check-licenses.ts` und `scripts/generate-third-party.ts` werden um Komponenten außerhalb von npm
  erweitert. Jede `third_party/<komponente>.md` liefert Name, Lizenz und den Pfad zur Lizenztextdatei. Der
  Generator fügt diese Texte an, der Check prüft Vollständigkeit und Aktualität.

## R4 – Eigene Boot-ROM (ADR-0004)

**Decision**:

- Selbst geschrieben in SM83-Assembler: `src/adapters/emulator/bootrom/dmg-boot.asm`, gebaut mit
  RGBDS v1.0.4 **(PI)**. Keine Bytes und kein Code der Nintendo- oder SameBoy-Boot-ROMs.
- Größe 256 Byte (`$0000–$00FF`). Ab `$0100` wird ausgeblendet, sobald `$FF50` beschrieben wird.
  Grundlage ist Pan Docs, Tabelle „Power Up Sequence“, Zeile DMG: 256 Byte.
- Ablauf: Grundinitialisierung → eigenes Logo darstellen (Logo-Daten in der Boot-ROM, da wir nicht wie
  das Original das Cartridge-Logo zeichnen) → kurze Haltezeit → **VRAM löschen** (PI, siehe R6) →
  Header-Checksumme berechnen (für die Flags, siehe unten) → Register und I/O auf Pan-Docs-Werte setzen → Zeitabgleich → `$FF50` beschreiben.
- **Endzustand laut Pan Docs (Spalte DMG)**, CPU: A=`$01`, B=`$00`, C=`$13`, D=`$00`, E=`$D8`, H=`$01`,
  L=`$4D`, PC=`$0100`, SP=`$FFFE`; F: Z=1, N=0, **H und C hängen von der Header-Checksumme ab** (beide 0,
  wenn das Byte `$014D` gleich `$00` ist, sonst beide 1). Die Boot-ROM muss die Checksumme also
  **immer** auswerten, auch ohne „Hardware-nah“. Die Hardware-Register werden aus der Tabelle „Hardware
  registers“ derselben Seite übernommen (Spalte „DMG / MGB“) und als Test-Fixture mit Quellenangabe
  abgelegt.
- **DIV = `$AB` bei PC=`$0100`** (Pan Docs: zeitkritisch). Das legt die Laufzeit der Boot-ROM auf ein
  Fenster fest. Die Boot-ROM endet nach einer festen, per Test gemessenen Zyklenzahl. ADR-0004
  dokumentiert den gewählten Wert. Die Gesamtdauer muss nicht der Nintendo-Boot-ROM entsprechen,
  verbindlich ist der Endzustand.
- **Byte-Budget** (erster Arbeitsschritt, per Mini-Spike zu belegen): Init ~30 B, Logo-Kopierroutine
  ~20 B, Logo-Daten ≤ 96 B (z. B. 1-bpp-Kacheln, beim Kopieren verdoppelt), Checksumme ~15 B,
  Register/I/O-Setup ~50 B, Zeitabgleich ~15 B, Reserve ~30 B. Reicht das nicht, wird das Logo kleiner.
  Es wird **nicht** auf eine größere Boot-ROM ausgewichen.
- Artefakt: `src/adapters/emulator/bootrom/generated/dmg-boot.ts` (Bytes als `Uint8Array`) plus
  `BUILD-INFO.json`. Committet, Nachbau-Check wie R2 (läuft im Job `check`, da RGBDS ohne Docker
  auskommt). Dateiname bewusst nicht `dmg_boot.bin`, das `.gitignore` sperrt diesen Namen.

**Alternatives considered**: SameBoys `BootROMs/dmg_boot.asm` (Expat, vom Projektinhaber
ausgeschlossen); Boot-ROM in TypeScript als Bytes (fehleranfällig, ohne Assembler kaum wartbar).

## R5 – Modus „Hardware-nah“ ohne Nintendo-Logo im Repo (ADR-0004) **(PI: Hash im eigenen Code)**

**Decision**:

- Die Prüfung läuft nicht in der Boot-ROM, sondern in unserem Code, beim Übergang nach `$0100`
  (`$FF50` beschrieben). Geprüft werden SHA-256 über `$0104–$0133` gegen eine Konstante und die
  Header-Checksumme `$014D` nach Pan-Docs-Formel („The Cartridge Header“).
- Bei Abweichung hält der Emulator an, bevor ein Befehl ab `$0100` ausgeführt wird. Danach folgt das
  Ereignis `EmulatorHalted` mit Grund `header-logo` oder `header-checksum`. Ohne „Hardware-nah“ startet
  das ROM trotzdem, und die UI zeigt einen Hinweis (Edge Case aus der Spec).
- Die Hash-Konstante entsteht beim Build: `scripts/build-test-roms.ts` erzeugt mit `rgbfix` ein
  Referenz-ROM, daraus wird `src/core/rom/logo-hash.generated.ts` erzeugt. Die Datei wird **committet**,
  damit `npm run build` ohne RGBDS auskommt. `npm run check` erzeugt sie neu und schlägt bei `git diff`
  fehl. Logo-Bytes stehen nie im Repo, nur ihr Hash.
- **Direktstart**: Hier gibt es keinen Übergang über `$FF50`. Mit „Hardware-nah“ wird deshalb vor dem
  ersten Befehl geprüft. Halt und Ereignis sind dieselben.
- Reine Header-Logik (Parsen, Checksumme, Logo-Hash, CGB-Flag) liegt framework- und fremdcodefrei in
  `src/core/rom/`.

**Abweichung zum Original (in ADR-0004 dokumentiert)**: Das Original prüft vor der Übergabe und hängt
dann in einer Endlosschleife. Wir halten am selben logischen Punkt an. Für Spiele ist das nicht
beobachtbar, weil sie nie ausgeführt werden.

## R6 – Direktstart ohne Boot-ROM

**Umsetzung (2026-10-18, ADR-0004)**: Der Snapshot ist ein SameBoy-Save-State vom Übergabepunkt der eigenen
Boot-ROM, einmalig mit einem neutralen Modul erzeugt (`dmg_capture_handoff`). Er wird beim Direktstart
geladen, danach wird F nach `$014D` gesetzt. So bleibt der Direktstart ohne Boot-Code für das Spiel und
trotzdem identisch. Die ursprüngliche Planung folgt unten.

**Decision (Planung)**: Wrapper-Funktion `dmg_direct_start()` in `wrapper.c` (unser Code, MIT). Sie setzt CPU-
und I/O-Register auf die Pan-Docs-Werte, F abhängig von `$014D`, und `boot_rom_finished = true`. Zusätzlich
setzt sie die internen Zustände, die unsere Boot-ROM zeitabhängig hinterlässt: Feinanteil des
Teilerzählers, PPU-Zeile und -Punkt sowie APU-Zustand. Grundlage dafür ist ein **gemessener Snapshot
am Übergabepunkt unserer Boot-ROM**.

**Rationale**: FR-010/SC-002 verlangen identisches Verhalten. Im Spike lagen Direktstart und Boot-Stub
nach 120 Frames einen Zählerschritt auseinander, weil der Stub ein paar Zyklen brauchte. Die
Pan-Docs-Tabelle allein reicht also nicht.

**VRAM (PI, 2026-10-18)**: Die Boot-ROM löscht das VRAM nach dem Logo und vor der Übergabe. Der
Direktstart setzt das VRAM ebenfalls auf 0. Beide Modi übergeben also mit leerem VRAM. Abweichung zum
Original: Dort bleibt das Logo im VRAM stehen, bis das Spiel eigene Grafik lädt. Laut Pan Docs darf sich
kein Spiel darauf verlassen. Die Löschschleife kostet wenige Bytes und geht in das Zeitfenster für DIV
ein (R4). Festgehalten in ADR-0004.

**Test**: Der **vollständige** interne Zustand bei PC=`$0100` wird in beiden Modi verglichen: Register,
I/O, Teiler, PPU-Position, APU, VRAM, WRAM, HRAM und OAM. Danach folgt der Ausgabevergleich nach N Frames
(SC-002) für **jedes** Test-ROM aus `tests/roms/src/` mit ausgeschaltetem „Hardware-nah“
(Constitution VII: jedes Test-ROM identisch).
**Risiko**: SameBoy-Interna (`GB_INTERNAL`) können sich bei einem Core-Update ändern. Der Test fängt
das ab, der Core ist ohnehin auf einen Commit festgelegt.

## R7 – Determinismus

**Decision**: `GB_random_seed(<feste Konstante>)` vor jedem `GB_init`/Reset. Pan Docs nennt WRAM und HRAM
beim Einschalten zufällig, für reproduzierbare Tests und den Vergleich der beiden Modi braucht es
aber festen Startinhalt. Spike-Beleg: zwei Läufe mit gleichem Seed ergaben identischen Start-RAM und
identischen Bild-Hash.

## R8 – Ausführungsmodell, Zeitgeber, Ton

**Decision**:

- Der Emulator läuft in M1 im **Hauptthread**, angestoßen über `requestAnimationFrame`.
- **Taktgeber**: Solange der Ton freigegeben ist, bestimmt der **Füllstand des AudioWorklet-Puffers**, wie
  viele Frames gerechnet werden. Liegt er unter dem Ziel, wird ein Frame mehr gerechnet, liegt er darüber,
  einer weniger. So driften Bild und Ton über 10 Minuten nicht auseinander (SC-007). Ohne freigegebenen Ton
  oder bei Stumm ohne Ausgabe zählt die verstrichene Zeit mal der DMG-Bildrate. Den Wert übernehmen wir aus
  Pan Docs, nicht aus dem Gedächtnis (offener Punkt). Höchstens 3 Frames werden nachgeholt. Nach Pause oder
  Hintergrund wird der Zeitbezug zurückgesetzt, damit es keinen Zeitsprung gibt.
- Ton: Der APU-Sample-Callback schreibt in einen Puffer im WASM. Pro Frame übergibt der Adapter die
  Samples per `postMessage` (Transfer) an einen **AudioWorklet**. Der Worklet puffert etwa 60–100 ms und
  meldet seinen Füllstand zurück (Taktgeber, siehe oben). Unterlauf (Stille) und Überlauf (Verwerfen)
  bleiben nur Notfall und werden gezählt (Testmetrik). Die Sample-Rate des Cores ist die
  `AudioContext.sampleRate`. Lautstärke und Stumm laufen über einen `GainNode`, wirken sofort und
  beeinflussen den Emulator nicht. Pause und Hintergrund rufen `AudioContext.suspend()` auf, der
  Worklet blendet kurz aus und ein, damit es nicht knackst (FR-020).
- **Kein `SharedArrayBuffer`**: Der bräuchte COOP/COEP-Header und damit eine Hoster-Konfiguration, was
  Constitution IX widerspricht.
- Freigabe des Tons beim ersten Tippen: `AudioContext.resume()` im ersten Pointer-Ereignis. Bis dahin
  zeigt die UI einen Hinweis (Edge Case).

**Rationale**: 0,9 ms pro Frame im Spike lassen viel Luft. Ein Worker brächte Nachrichten-Overhead für
Bild und Eingaben und ist erst nötig, wenn SC-003 auf dem Gerät scheitert. Der Wechsel bleibt lokal im
Adapter (Port unverändert).

**Alternatives considered**: Web Worker mit Bildübertragung (später möglich); `ScriptProcessorNode`
(veraltet); `SharedArrayBuffer`-Ringpuffer (Header-Abhängigkeit).

## R9 – Bilddaten und `changedMemory`

**Decision**:

- Der Core rendert über `GB_set_rgb_encode_callback` direkt **Graustufen-Indizes 0–3** statt RGBA. Dazu
  wird eine Palette mit vier unterscheidbaren Grauwerten gesetzt, der Encoder liefert den Index. Der
  Snapshot erhält ein neues Feld `screen` (160 × 144 Byte). Darauf bauen Normalmodus, kontrastreiches
  E-Ink-Mapping und Dithering im Screen-View auf.
  **Risiko**: Bildverarbeitung im Core (Frame-Blending, Farbkorrektur) muss abgeschaltet sein, sonst
  entstehen Zwischenwerte. Ein Test prüft, dass nur die Werte 0–3 vorkommen.
- `changedMemory`: Der Schreib-Callback markiert geschriebene 256-Byte-Seiten in einem Bitfeld im Wrapper.
  Schreibzugriffe auf `$0000–$7FFF` sind MBC-Steuerung und kein Speicher, sie werden nicht markiert. Bei
  einer Veröffentlichung fasst der Adapter benachbarte Seiten zu Bereichen zusammen, liest die Bytes und
  setzt das Bitfeld zurück. Ohne Abonnenten wird nichts kopiert.

## R10 – Persistenz

**Decision**:

- Neuer Port `RomStorePort` (`src/core/ports/rom-store.ts`) mit genau einem Eintrag `current`: ROM-Bytes,
  Dateiname, Ladezeitpunkt und optional der Spielstand (Batterie-RAM). Ersetzen löscht den Spielstand im
  selben Schreibvorgang. Adapter: IndexedDB (`src/adapters/storage/indexeddb-rom-store.ts`). Der
  Datenbankname wird aus `PROJECT_NAME` abgeleitet (eine Stelle).
- ADR-0005 erhält einen Nachtrag: In M1 wird das eine geladene ROM als Laufzeit-Eingabe mit Spielstand
  getrennt vom Projektspeicher gehalten. `ProjectStorePort` bleibt ROM-frei.
- Spielstand speichern: nur bei Cartridge-Typen mit Batterie laut Header. Gespeichert wird, wenn sich das
  Cartridge-RAM geändert hat (Schreib-Callback auf `$A000–$BFFF`), und zwar höchstens alle 2 s, bei
  Pause, bei `visibilitychange` → hidden und bei `pagehide`.
- Kleine Einstellungen (Audio, Startmodus, „Hardware-nah“) und der Layout-Zustand liegen in
  `localStorage` (Constitution IX). Schlüssel werden aus `PROJECT_NAME` abgeleitet.
- Speicher voll (`QuotaExceededError`): Ereignis `StorageFailed`, das ROM läuft trotzdem aus dem Speicher
  (Edge Case).

## R11 – Test-ROMs und Toolchain **(PI: RGBDS 1.0.4 fest)**

**Decision**:

- `scripts/fetch-rgbds.ts` lädt `rgbds-linux-x86_64.tar.xz` von Release v1.0.4 (gbdev/rgbds, MIT, laut
  LICENSE), prüft SHA-256 `3e19e50ea602e316be709160acaf0a708b1fa6d32d219ec541f244442895dbb7` und entpackt
  nach `.tools/rgbds/` (in `.gitignore`). Ein reines Entwicklungswerkzeug, nicht ausgeliefert, daher kein
  Eintrag in `third_party/`.
- Selbst geschriebene Test-ROM-Quellen in `tests/roms/src/*.asm`. `scripts/build-test-roms.ts` baut sie
  mit `rgbasm`/`rgblink`/`rgbfix` nach `tests/roms/build/` (gitignored, ROMs werden nie committet). Das
  läuft als `pretest`.
- Benötigte Test-ROMs:
  - Boot-Zustand mit Checksumme `$00` und mit Checksumme ≠ `$00` (F-Flags)
  - je ein ROM pro Cartridge-Typ: ROM ohne MBC, MBC1, MBC3, MBC5, jeweils mit Bankwechsel und
    Prüfmuster pro Bank
  - MBC5 mit Batterie für den Spielstand-Roundtrip
  - je ein ROM pro Tonkanal (US4-AS5)
  - Eingabetest (Tastenzustand in WRAM)
  - Logo/Checksumme kaputt (per Byte-Patch nach `rgbfix`)
  - reines CGB-ROM (CGB-Flag laut Pan Docs „The Cartridge Header“)
- Einschränkung: Das Skript unterstützt Linux x86_64 (Codespace, CI). Andere Plattformen sind ein
  offener Punkt.

## R12 – Views, Layout, E-Ink-Modus

**Decision**:

- Vier Views in `src/views/`: `screen`, `controller`, `rom-info`, `memory-map`.
- Rate pro Slot: Die App gibt jedem Slot einen eigenen, gedrosselten `FrameStateSource`
  (`src/app/layout/slot-frame-source.ts`). Unsichtbar heißt: keine Benachrichtigung (SC-006). Ein View
  wählt seine Rate über die neue Aktion `SetFrameRate`, die die App pro Slot behandelt, nicht der
  Emulator. Die globale Emulator-Rate ist `full`, solange ein sichtbarer Slot Frames abonniert, sonst
  `on-demand`. Damit baut der E-Ink-Modus auf der drosselbaren Rate auf, ohne Sonderlogik im Emulator
  (FR-022).
- E-Ink-Modus (Zustand des Screen-Views, per `serialize` im Layout gespeichert): Raten 2/4/10/15 Bilder
  pro Sekunde (über `everyNthFrame`), kontrastreiches Mapping (z. B. 0/1 → Weiß/Hellgrau mit
  vergrößertem Abstand) und optionales geordnetes Dithering (Bayer). Die genauen Mappings werden am
  E-Ink-Gerät abgestimmt.
- Zoom: `LayoutState` erhält `maximizedSlot: number | null`. Bleibt `version: 1`, weil M0 nie
  persistiert hat. Ausgeblendete Slots gelten als unsichtbar (FR-024).
- Controller: Pointer Events mit `setPointerCapture`, mehrere gleichzeitige Pointer. Keine Hover-Zustände.
- Tastatur und Game-Controller (PI, 2026-10-18) sitzen nicht im Controller-View, sondern im
  Eingabe-Adapter `src/adapters/input/`, verdrahtet in `main.tsx`, damit sie ohne sichtbares
  Controller-Quadrat wirken:
  - Tastatur: WASD = Steuerkreuz, J = A, K = B, Enter = Start, Leertaste = Select (über `KeyboardEvent.code`,
    damit sie auch auf anderen Tastaturlayouts gleich liegen).
  - Gamepad API: Chrome meldet einen Controller erst nach dem ersten Tastendruck (`gamepadconnected`),
    danach wird `navigator.getGamepads()` einmal pro Bildschirmframe abgefragt. Standard-Mapping:
    rechte Fronttaste (1) = A, untere (0) = B, wie die Lage auf dem DMG; 8 = Select, 9 = Start,
    12–15 = Steuerkreuz; linker Stick (Achsen 0/1, Schwelle 0,5) wirkt wie das Steuerkreuz. Controller
    ohne Standard-Mapping werden nur mit diesen Indizes versucht. Ob ein konkreter Controller unter
    Android sauber erkannt wird, zeigt erst der Gerätetest.
- Spielinhalt im Screen-View: Canvas mit `image-rendering: pixelated`, ganzzahlige Skalierung.

## Offene Punkte (nicht blockierend, bei Umsetzung klären)

0. ~~Erster CI-Lauf von `core-reproducible` muss das lokal gebaute Artefakt bestätigen (R2).~~ erledigt (T017, siehe arc42 Kap. 7)

1. ~~Liste der gelinkten Emscripten-System-Bibliotheken und deren Lizenzen (R3).~~ erledigt (T013, `third_party/emscripten.md`)
2. ~~DMG-Bildrate und Zyklen pro Frame aus Pan Docs übernehmen (R8).~~ erledigt (T043, T045)
3. ~~Hardware-Register-Tabelle vollständig aus Pan Docs als Fixture übernehmen (R4).~~ erledigt (T054, `tests/boot-state/pan-docs-dmg.ts`)
4. ~~Byte-Budget der Boot-ROM per Mini-Spike belegen (R4).~~ erledigt (T060, ADR-0004)
5. ~~US5-AS4~~ entschieden: Normalmodus ist Standard, E-Ink als Schalter (Spec angepasst).
6. RGBDS-Skript für macOS/Windows (R11).
