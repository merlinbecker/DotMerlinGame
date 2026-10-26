# Feature Specification: M1b – Speicher-Ansichten (nur lesen)

**Feature Branch**: `feature/firstSteps`

**Created**: 2026-10-26

**Status**: Draft

**Input**: Meilenstein M1b aus `docs/BOOTSTRAP-BRIEFING.md`, Abschnitt 8 (Entscheidung des Projektinhabers
vom 2026-10-26): Lese-Ansichten auf den laufenden Emulator, jeweils als eigener View im Raster: Hex-View
(ROM bankweise, WRAM, HRAM, I/O-Register), VRAM-Tiles, Tilemaps (Hintergrund und Fenster), OAM/Sprites
und CPU-Register mit Flags. Nur Anzeige: kein Schreiben in Speicher oder Register, keine Breakpoints, kein
Step (bleibt M4). Ziel: bestehende ROMs schon vor dem Debugger genauer anschauen.

## Clarifications

### Session 2026-10-26

- Q: Sollen die I/O-Register nur als rohe Hex-Bytes erscheinen oder auch entschlüsselt? → A: Der Hex-View
  zeigt im Bereich I/O zu jeder belegten Adresse den Kurznamen des Registers (z. B. `LCDC`, `STAT`,
  `SCY`), aber keine Bit-Bedeutung. Eine Aufschlüsselung der Bits folgt frühestens mit dem Debugger (M4).
- Q: Mit welcher Aktualisierungsrate startet ein neu in einen Slot gelegter Speicher-View? → A: „1 pro
  Sekunde“ auf allen Geräten; „Live“ und „nur auf Anforderung“ sind danach wählbar.
- Q: Wie viele Bytes zeigt der Hex-View pro Zeile in schmalen Slots? → A: 16 Bytes, wenn sie bei
  Mindestschriftgröße in den Slot passen, sonst 8; bei jeder Größenänderung neu bestimmt.
- Q: Wie zeigt der Hex-View Cartridge-RAM mit mehreren Bänken oder bei gesperrtem RAM? → A: Jede RAM-Bank
  ist einzeln wählbar wie bei ROM; der Inhalt wird immer gezeigt, eingeblendete Bank und Zustand
  „gesperrt“ sind ohne Farbe gekennzeichnet.
- Q: In welcher Palette zeigen „Tiles“, „Tilemaps“ und „Sprites“ Kachelbilder, und womit starten sie? →
  A: Alle drei haben den Schalter „Rohwerte“ / „mit Palette“ und starten mit „Rohwerte“; „mit Palette“
  heißt BGP für Tiles und Tilemaps und OBP0/OBP1 je Sprite.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Speicher als Hex-Werte ansehen (Priority: P1)

Die Nutzerin hat ein ROM geladen und will wissen, was gerade im Speicher steht. Sie öffnet in einem
Slot den View „Hex“, wählt einen Bereich (z. B. WRAM) und blättert seitenweise durch die Bytes. Werte,
die sich seit der letzten Aktualisierung geändert haben, sind ohne Farbe hervorgehoben. Für das ROM kann
sie jede Bank einzeln ansehen, nicht nur die gerade eingeblendete.

**Why this priority**: Der Hex-View ist die allgemeinste Ansicht und Grundlage für alle anderen; mit ihm
lässt sich jedes ROM ansehen.

**Independent Test**: Test-ROM laden, das bekannte Werte an feste Adressen schreibt; der Hex-View zeigt an
diesen Adressen genau diese Werte.

**Acceptance Scenarios**:

1. **Given** ein laufendes ROM, **When** der View „Hex“ geöffnet und ein Bereich gewählt wird, **Then**
   zeigt er Adresse und Bytes des Bereichs, je Zeile 16 Bytes oder in schmalen Slots 8 Bytes (siehe
   FR-005), Werte und Adressen hexadezimal.
2. **Given** der View „Hex“, **When** weitergeblättert wird, **Then** springt die Ansicht um genau eine
   Seite ohne Animation; es gibt kein Dauer-Scrollen.
3. **Given** ein ROM mit mehreren Bänken, **When** im Bereich „ROM“ eine Bank gewählt wird, **Then**
   zeigt der View den Inhalt genau dieser Bank, unabhängig davon, welche Bank das Spiel gerade
   eingeblendet hat; die aktuell eingeblendete Bank ist erkennbar. Dasselbe gilt für die RAM-Bänke im
   Bereich „Cartridge-RAM“; ist der RAM vom Spiel gesperrt, zeigt der View trotzdem den Inhalt und
   kennzeichnet den Zustand „gesperrt“.
4. **Given** ein laufendes Spiel, **When** sich ein angezeigtes Byte ändert, **Then** ist es bei der
   nächsten Aktualisierung invertiert oder umrahmt markiert, nicht nur farbig.
5. **Given** der View „Hex“, **When** eine Adresse eingegeben wird, **Then** springt die Ansicht auf die
   Seite mit dieser Adresse und markiert sie.
6. **Given** der View „Hex“, **When** die Nutzerin ein Byte antippt, **Then** wird nichts verändert
   (nur Anzeige); höchstens die Adresse des Bytes wird hervorgehoben.
7. **Given** der Bereich „I/O“, **When** er angezeigt wird, **Then** steht neben jeder belegten
   Register-Adresse ihr Kurzname laut Pan Docs (z. B. `$FF40 LCDC`); unbelegte Adressen haben keinen
   Namen. Bit-Bedeutungen werden nicht angezeigt.

---

### User Story 2 - CPU-Register und Flags ansehen (Priority: P1)

Die Nutzerin öffnet den View „Registers“ und sieht die CPU-Register und Flags des laufenden Spiels.
Ist der Emulator pausiert, sieht sie den Stand zum Zeitpunkt der Pause.

**Why this priority**: Register sind der kleinste, aber zentrale Einblick in den Programmablauf und
werden mit wenig Aufwand nutzbar.

**Independent Test**: Test-ROM, das feste Registerwerte setzt und dann anhält (Endlosschleife); der View
zeigt genau diese Werte.

**Acceptance Scenarios**:

1. **Given** ein laufendes ROM, **When** der View „Registers“ angezeigt wird, **Then** zeigt er A, F, B,
   C, D, E, H, L, SP und PC als Hex-Werte, zusätzlich die Registerpaare BC, DE, HL sowie die Flags Z, N,
   H und C einzeln als gesetzt/nicht gesetzt (durch Zeichen, nicht durch Farbe).
2. **Given** der Emulator ist pausiert, **When** der View angezeigt wird, **Then** zeigt er den Stand bei
   der Pause und ändert sich nicht mehr, bis fortgesetzt wird.
3. **Given** ein laufendes Spiel, **When** sich ein Register zwischen zwei Aktualisierungen ändert,
   **Then** ist es invertiert oder umrahmt markiert.

---

### User Story 3 - Kacheln im VRAM ansehen (Priority: P2)

Die Nutzerin öffnet den View „Tiles“ und sieht alle 384 Kacheln des Tile-Speichers als kleine Bilder in
einem Raster. Tippt sie eine Kachel an, sieht sie Nummer, Adresse und die 16 Bytes der Kachel.

**Why this priority**: Grafik ist bei Game-Boy-Spielen der anschaulichste Speicherinhalt und Vorbereitung
für den Tile-Editor (M5).

**Independent Test**: Test-ROM, das bekannte Kachelmuster in den Tile-Speicher kopiert; die angezeigten
Kacheln stimmen pixelgenau mit den erwarteten Mustern überein.

**Acceptance Scenarios**:

1. **Given** ein laufendes ROM, **When** der View „Tiles“ angezeigt wird, **Then** sind alle 384 Kacheln
   in drei erkennbaren Blöcken zu je 128 Kacheln dargestellt, auf einer Seite oder auf Seiten zum
   Blättern.
2. **Given** der View „Tiles“, **When** eine Kachel angetippt wird, **Then** zeigt er ihre Nummer, die
   Startadresse und ihre 16 Bytes in Hex.
3. **Given** der View „Tiles“, **When** zwischen „Rohwerte“ und „mit Palette“ umgeschaltet wird, **Then**
   werden die vier Farbindizes entweder direkt als vier Graustufen oder über die aktuelle
   Hintergrund-Palette abgebildet. Ein neu geöffneter View startet mit „Rohwerte“.
4. **Given** ein E-Ink-Gerät, **When** die Kacheln dargestellt werden, **Then** sind die vier Graustufen
   unterscheidbar (wie im E-Ink-Modus des Screens: kontrastreiches Mapping, optional Muster).

---

### User Story 4 - Hintergrund- und Fenster-Karte ansehen (Priority: P2)

Die Nutzerin öffnet den View „Tilemaps“ und sieht die Hintergrund-Karte (32 × 32 Kacheln) so, wie sie im
Speicher steht, inklusive des Ausschnitts, den der Bildschirm gerade zeigt. Sie kann zur Fenster-Karte
umschalten.

**Why this priority**: Erklärt, wie Scrolling und Fenster auf dem DMG funktionieren; baut auf den Kacheln
aus US3 auf.

**Independent Test**: Test-ROM mit bekannter Kachel-Karte und festen Scroll-Werten; die Darstellung stimmt
pixelgenau, der Bildschirmausschnitt liegt an der erwarteten Stelle.

**Acceptance Scenarios**:

1. **Given** ein laufendes ROM, **When** der View „Tilemaps“ angezeigt wird, **Then** zeigt er die
   vollständige 32 × 32-Kachel-Karte des Hintergrunds mit den Kacheln, die die aktuellen
   LCD-Einstellungen auswählen (Karten-Bereich und Kachel-Adressierung laut Pan Docs).
2. **Given** die Hintergrund-Karte, **When** sie angezeigt wird, **Then** ist der gerade sichtbare
   Bildschirmausschnitt (160 × 144 Pixel, Position aus den Scroll-Registern, mit Umbruch am Rand)
   durch einen Rahmen markiert.
3. **Given** der View, **When** auf „Window“ umgeschaltet wird, **Then** zeigt er die Fenster-Karte und
   die aktuelle Fensterposition; ist das Fenster abgeschaltet, steht dies als Text dabei.
4. **Given** eine Kachel in der Karte, **When** sie angetippt wird, **Then** zeigt der View
   Kartenposition, Kartenadresse und Kachelnummer.

---

### User Story 5 - Sprites (OAM) ansehen (Priority: P2)

Die Nutzerin öffnet den View „Sprites“ und sieht die 40 Sprite-Einträge mit Position, Kachel, Attributen
und einem Bild der Kachel.

**Why this priority**: Sprites sind neben dem Hintergrund der zweite Grafikweg und mit dem Hex-View allein
schwer zu lesen.

**Independent Test**: Test-ROM, das bekannte Einträge in den Sprite-Speicher schreibt; der View zeigt
genau diese Werte.

**Acceptance Scenarios**:

1. **Given** ein laufendes ROM, **When** der View „Sprites“ angezeigt wird, **Then** zeigt er für jeden
   der 40 Einträge Nummer, Y, X, Kachelnummer, Priorität, Spiegelung X/Y und Palette (OBP0/OBP1) sowie
   ein Bild der Kachel, seitenweise blätterbar. Das Bild startet mit „Rohwerte“ und zeigt mit „mit
   Palette“ die Farben über die OBP0/OBP1-Palette des Eintrags.
2. **Given** die Sprite-Größe 8 × 16 ist aktiv, **When** die Einträge angezeigt werden, **Then** zeigt das
   Bild beide Kacheln des Sprites.
3. **Given** ein Eintrag liegt außerhalb des sichtbaren Bereichs, **When** er angezeigt wird, **Then** ist
   er als „nicht sichtbar“ gekennzeichnet (Text oder Symbol, nicht Farbe).

---

### User Story 6 - Ansichten auf E-Ink und neben dem Spiel nutzen (Priority: P2)

Die Nutzerin legt einen Speicher-View neben den Screen und spielt weiter. Auf ihrem E-Ink-Gerät (Boox
Palma, Boox Go Color 7) stellt sie eine niedrige Aktualisierungsrate ein oder aktualisiert nur auf
Knopfdruck, damit das Display nicht ständig neu zeichnet.

**Why this priority**: E-Ink-Tauglichkeit ist ein Qualitätsziel; ohne Drosselung würden die Ansichten auf
E-Ink unbrauchbar und auf Handys das Spiel bremsen.

**Independent Test**: Speicher-View sichtbar neben dem Screen; Anzahl der Neuzeichnungen pro Sekunde
messen, Emulationsgeschwindigkeit prüfen; Graustufen-Screenshot prüfen.

**Acceptance Scenarios**:

1. **Given** ein Speicher-View neben dem Screen, **When** das Spiel läuft, **Then** läuft die Emulation
   mit voller Geschwindigkeit weiter.
2. **Given** ein Speicher-View, **When** die Aktualisierungsrate eingestellt wird (Stufen siehe FR-010),
   **Then** zeichnet er höchstens mit dieser Rate neu; die Einstellung bleibt nach Neuladen erhalten.
3. **Given** die Einstellung „nur auf Anforderung“, **When** „Refresh“ in der Kopfleiste getippt wird,
   **Then** zeigt der View genau einmal den aktuellen Stand.
4. **Given** ein Speicher-View ist ausgeblendet (anderer View im Slot, verdeckt durch Zoom, Tab im
   Hintergrund), **When** Frames laufen, **Then** verarbeitet er keine Aktualisierungen.
5. **Given** ein Speicher-View, **When** er im Graustufen-Screenshot geprüft wird, **Then** sind alle
   Markierungen (geändert, ausgewählt, eingeblendete Bank) ohne Farbe erkennbar.
6. **Given** ein Slot ohne Speicher-View, **When** ein Speicher-View hineingelegt wird, **Then** steht
   seine Aktualisierungsrate auf „1 pro Sekunde“.

---

### Edge Cases

- Kein ROM geladen: Jeder Speicher-View zeigt einen Hinweis „No ROM loaded“ statt leerer Tabellen.
- Bereich nicht vorhanden (z. B. kein Cartridge-RAM laut Header, ROM- oder RAM-Bank über der Bankanzahl): Der
  Bereich ist nicht wählbar oder zeigt einen Hinweis, nie erfundene Werte.
- Speicherbereiche, die auf dem DMG beim Lesen besondere Werte liefern (z. B. „Not Usable“
  `$FEA0–$FEFF`, VRAM/OAM während des LCD-Zugriffs): Der View zeigt den inneren Zustand des Emulators,
  nicht das, was die CPU in diesem Moment lesen würde; das ist im View vermerkt.
- Lesen darf das Spiel nicht beeinflussen: Ein angezeigtes I/O-Register mit Leseseiteneffekt wird nicht
  so gelesen, dass sich das Spielverhalten ändert (gleiche Bild- und Tonausgabe mit und ohne sichtbare
  Speicher-Views).
- Emulator angehalten wegen „Hardware-nah“ (M1): Views zeigen den Stand beim Anhalten.
- ROM wird gewechselt oder zurückgesetzt: Views zeigen sofort den neuen Stand, gewählte Bank wird auf
  einen gültigen Wert zurückgesetzt.
- Sehr kleines Display (Boox Palma im Hochformat, zwei Slots): Alle Ansichten bleiben ohne horizontales
  Scrollen lesbar (Seiten, Vollbild per Zoom-Schalter aus M1).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Es MUSS fünf neue Views geben, die wie die M1-Views über die Pfeiltasten der Kopfleiste in
  jeden Slot gelegt werden können: „Hex“, „Registers“, „Tiles“, „Tilemaps“, „Sprites“.
- **FR-002**: Alle fünf Views MÜSSEN ausschließlich lesen. Es gibt keine Möglichkeit, Speicher, Register
  oder Emulatorzustand über sie zu verändern; Breakpoints, Step und Schreibzugriffe gehören zu M4.
- **FR-003**: Die Views MÜSSEN Zustand nur über den View-Vertrag beziehen (Frame-Zustand, Ereignisse,
  Sitzungszustand) und dürfen nicht direkt auf den Emulator zugreifen (Constitution II). Wird dafür der
  Vertrag erweitert, dann nur durch getypte Ergänzungen (Constitution IV).
- **FR-004**: Der Hex-View MUSS die Bereiche ROM (jede Bank einzeln wählbar), VRAM, Cartridge-RAM (falls
  laut Header vorhanden; jede RAM-Bank einzeln wählbar), WRAM, OAM, I/O-Register, HRAM und das Interrupt-Enable-Register anzeigen.
  Bereichsgrenzen stammen aus Pan Docs („Memory Map“) und der vorhandenen Memory-Map-Konstante aus M1.
  Im Bereich I/O MUSS zu jeder belegten DMG-Register-Adresse der Kurzname laut Pan Docs („Hardware
  Registers“) stehen; Bit-Bedeutungen gehören nicht zu M1b.
- **FR-005**: Der Hex-View MUSS seitenweise blättern, zu einer eingegebenen Adresse springen und die
  aktuell eingeblendete ROM-Bank kennzeichnen. Im Cartridge-RAM MUSS er den Inhalt der gewählten Bank
  immer zeigen, auch wenn das Spiel den RAM gerade gesperrt hat, und die eingeblendete RAM-Bank sowie den
  Zustand „gesperrt“ ohne Farbe kennzeichnen. Er MUSS 16 Bytes pro Zeile zeigen, wenn diese bei
  Mindestschriftgröße (Design-Token) in den Slot passen, sonst 8 Bytes. Die Zeilenbreite wird bei jeder
  Größenänderung des Slots neu bestimmt; jede Zeile beginnt an einer durch die Zeilenbreite teilbaren
  Adresse, und die aktuell oberste Adresse bleibt dabei auf der angezeigten Seite.
- **FR-006**: Der View „Registers“ MUSS A, F, B, C, D, E, H, L, SP, PC, die Paare BC, DE, HL und die Flags
  Z, N, H, C anzeigen.
- **FR-007**: Der View „Tiles“ MUSS alle 384 Kacheln des Tile-Speichers darstellen, wahlweise mit
  Rohwerten oder der aktuellen Hintergrund-Palette, und zu einer angetippten Kachel Nummer, Adresse und
  Bytes zeigen. Die Views „Tiles“, „Tilemaps“ und „Sprites“ MÜSSEN je einen Schalter „Rohwerte“ / „mit
  Palette“ haben und mit „Rohwerte“ starten; „mit Palette“ heißt BGP für Tiles und Tilemaps und die im
  Eintrag gewählte OBP0/OBP1 für Sprites.
- **FR-008**: Der View „Tilemaps“ MUSS die Hintergrund- und die Fenster-Karte nach den aktuellen
  LCD-Einstellungen darstellen und den sichtbaren Bildschirmausschnitt bzw. die Fensterposition
  markieren. Bedeutung der LCD-Steuerbits und Scroll-Register stammt aus Pan Docs.
- **FR-009**: Der View „Sprites“ MUSS alle 40 Einträge des Sprite-Speichers mit Position, Kachel,
  Attributen und Kachelbild anzeigen und die Sprite-Größe (8 × 8 / 8 × 16) berücksichtigen. Feldbedeutung
  stammt aus Pan Docs („OAM“).
- **FR-010**: Jeder Speicher-View MUSS eine einstellbare Aktualisierungsrate haben: „Live“ (etwa 10 pro
  Sekunde), „1 pro Sekunde“ und „nur auf Anforderung“ mit einer Aktion „Refresh“ in der Kopfleiste. Ein
  neu in einen Slot gelegter Speicher-View MUSS auf allen Geräten mit „1 pro Sekunde“ starten. Die
  Einstellung wird je Slot im Layout-Zustand gespeichert. Ist der Emulator pausiert, zeigt jeder View den
  Stand der Pause.
- **FR-011**: Werte, die sich seit der letzten Aktualisierung des Views geändert haben, MÜSSEN invertiert
  oder umrahmt markiert werden, nicht nur farbig (Briefing Abschnitt 4).
- **FR-012**: Sichtbare Speicher-Views DÜRFEN die Emulation nicht verlangsamen und das Spielverhalten nicht
  verändern: Bild- und Tonausgabe sind mit und ohne sichtbare Speicher-Views identisch.
- **FR-013**: Ausgeblendete Speicher-Views MÜSSEN 0 Aktualisierungen verarbeiten (wie SC-006 aus M1).
- **FR-014**: Die UI-Regeln (E-Ink-first) MÜSSEN für alle neuen Views gelten: Graustufen, keine
  Animationen, Blättern statt Scrollen, große Touch-Ziele, Design-Tokens. Kachelbilder nutzen das
  Graustufen-Mapping aus dem E-Ink-Modus des Screens (M1).
- **FR-015**: Ohne geladenes ROM MÜSSEN alle Speicher-Views einen Hinweis statt Werten zeigen.
- **FR-016**: Adressen, Bereichsgrenzen, Registerbedeutungen und Kachelformat MÜSSEN aus Pan Docs stammen
  und automatisch gegen selbst gebaute Test-ROMs geprüft werden (Constitution X, VIII).

### Key Entities

- **Speicher-View-Einstellungen**: je Slot gewählter Bereich, ROM-Bank, RAM-Bank, Seite, Aktualisierungsrate,
  Palette an/aus, Karte (Hintergrund/Fenster); Teil des serialisierbaren View-Zustands im Layout.
- **Speicherauszug**: der vom Emulator gelesene Inhalt eines Bereichs zu einem Zeitpunkt (Frame-Nummer);
  nur lesend, nie zurückgeschrieben.
- **CPU-Zustand**: Register und Flags eines Frames (bereits Teil des Frame-Zustands aus M0/M1).
- **Kachel**: 8 × 8 Pixel, 16 Bytes, 2 Bit je Pixel; Nummer und Adresse im Tile-Speicher.
- **Sprite-Eintrag**: einer von 40 Einträgen im Sprite-Speicher mit Position, Kachel und Attributen.
- **Änderungsmarkierung**: Menge der Adressen bzw. Register, die sich seit der letzten Anzeige geändert
  haben.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Für jeden der fünf Views gibt es ein selbst gebautes Test-ROM mit bekanntem Inhalt; 100 %
  der geprüften Werte (Bytes, Register, Kachelpixel, Karteneinträge, Sprite-Felder) stimmen mit dem
  Emulatorzustand überein (automatischer Test).
- **SC-002**: Mit Screen und einem sichtbaren Speicher-View auf „Live“ bleibt die Rechenzeit pro Frame auf
  dem Referenz-Smartphone im 95. Perzentil unter 16,7 ms (Messung wie SC-003 aus M1, Diagnose in ROM Info).
- **SC-003**: Jedes Test-ROM erzeugt nach 300 Frames dieselbe Bild- und Tonausgabe, egal ob keiner oder
  alle fünf Speicher-Views sichtbar sind (automatischer Test).
- **SC-004**: Ausgeblendete Speicher-Views verarbeiten 0 Aktualisierungen; ein View auf „1 pro Sekunde“
  zeichnet höchstens einmal pro Sekunde neu (automatischer Test).
- **SC-005**: Auf Boox Palma und Boox Go Color 7 sind alle fünf Views ohne horizontales Scrollen lesbar
  und bedienbar, alle Markierungen im Graustufen-Screenshot erkennbar (Gerätetest, Gerät und
  Chrome-Version im Abnahmeprotokoll notiert).
- **SC-006**: Eine Adresse im Hex-View ist von der Eingabe bis zur angezeigten Seite mit höchstens einer
  Neuzeichnung erreicht (kein schrittweises Blättern dorthin).

## Assumptions

- Das „ROM laden und direkt spielen“ aus M1 bleibt unverändert; M1b ist die Übergangszeit nach ADR-0005,
  in der fremde ROMs direkt ausgeführt und jetzt auch angesehen werden. Ab M3 werden importierte ROMs
  disassembliert.
- Der vorhandene View „Memory Map“ aus M1 bleibt statisch; der Hex-View ergänzt ihn um Inhalte. Eine
  Verknüpfung (Tippen auf einen Bereich öffnet den Hex-View) ist nicht Teil von M1b.
- Symbolnamen und Labels in den Ansichten gibt es erst, wenn Symbol-Dateien existieren (M2) und der
  Debugger sie nutzt (M4).
- Ob der Emulator-Core Speicher lesen kann, ohne Leseseiteneffekte auszulösen, und welche internen Werte
  (z. B. IME, HALT-Zustand) zugänglich sind, wird im Plan anhand des Cores geprüft, nicht angenommen. IME
  und HALT werden nur angezeigt, wenn das belegt möglich ist.
- Die Rate „Live“ von etwa 10 Aktualisierungen pro Sekunde ist ein Startwert und wird am Gerät überprüft.
- Game Boy Color-Bereiche (VRAM-Bank 1, Farbpaletten, WRAM-Bänke 2–7) gibt es nicht, weil nur der DMG-01
  emuliert wird.
