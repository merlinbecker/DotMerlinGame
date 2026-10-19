# Feature Specification: M1 – Emulator-Kern und eigene Boot-ROM

**Feature Branch**: `feature/firstSteps`

**Created**: 2026-10-18

**Status**: Abgenommen (2026-10-19, Version 0.3.0)

**Input**: Meilenstein M1 aus `docs/BOOTSTRAP-BRIEFING.md`, Abschnitt 8: Emulator-Core im Browser
als Headless Service. Screen-Quadrat und Controller-Quadrat. ROM aus dem lokalen Speicher laden.
Eigene Boot-ROM mit eigenem Logo (nur im Emulator). ADR zur Core-Auswahl.

Ergänzt durch Entscheidungen des Projektinhabers vom 2026-10-18: ausschließlich DMG-01 (kein Game
Boy Color, auch nicht in der Emulation), Tonausgabe ist Teil von M1, E-Ink-Modus des Screen-Views
ist Teil von M1, die eigene DotMerlinGame-Boot-ROM ist kompatibel zur Nintendo-Boot-ROM; eine
fremde freie Boot-ROM wird nicht eingebunden.

## Clarifications

### Session 2026-10-18

- Q: Wie viele ROMs soll der lokale Speicher in M1 halten? → A: Immer nur eines, das zuletzt geladene ROM. Ein neues ROM ersetzt das alte. Das ersetzte ROM liegt weiterhin als Datei auf dem Gerät; sein Spielstand geht verloren (kein Export in M1).
- Q: Soll M1 dem Nutzer das Speicherkonzept des ROMs vermitteln, und wie? → A: Ja, als statische
  Info: eine Übersicht der DMG-Adressbereiche mit markierten ROM-Bänken und die Header-Daten des
  geladenen ROMs. Es gibt keinen Live-Speicherinhalt, das wäre ein Vorgriff auf den Debugger in M4.
  Wie das auf Views verteilt wird, regelt die nächste Klärung.
- Q: Welche Cartridge-Typen (Bank-Controller) muss der Emulator in M1 mindestens ausführen? → A:
  ROM ohne MBC, MBC1, MBC3 und MBC5.
- Q: Sollen batteriegepufferte Spielstände (Cartridge-RAM) in M1 lokal gespeichert werden? → A: Ja.
  Sie werden lokal gespeichert, gehören zu dem einen ROM und werden beim Ersetzen des ROMs nach
  einem Hinweis mit gelöscht. Kein `.sav`-Export, keine Zusicherung für die MBC3-Echtzeituhr.
- Q: Wo liegen die Bedienelemente außerhalb des Gamepads? → A: Im View „ROM Info“: ROM laden,
  Startmodus, Pause/Fortsetzen/Zurücksetzen, Lautstärke und die Header-Daten. Dazu kommt ein
  Stumm-Schalter in der Kopfleiste des Screen-Views. Die Adressbereiche liegen in einem eigenen
  View „Memory Map“.
- Q: Gegen welche Hardware-Revision der Pan-Docs-Tabelle "Power Up Sequence" prüfen die
  Boot-Zustandstests? → A: Nur die Spalte „DMG“ (Serien-DMG-01).
- Q (Plan, 2026-10-18): Ist der E-Ink-Modus des Screens voreingestellt, obwohl M1 nur ein Theme hat? →
  A: Nein. Der Screen startet im Normalmodus, der E-Ink-Modus ist ein Schalter und bleibt pro Gerät
  gespeichert. Eine Voreinstellung über einen Theme-Schalter folgt erst in einem späteren Meilenstein.
- Q (Analyse, 2026-10-18): Wie wird ein Quadrat vergrößert, wenn ein Doppeltipp im Controller eine
  Spieleingabe ist? → A: Für alle Quadrate gibt es nur einen Zoom-Schalter in der Kopfleiste, keinen
  Doppeltipp. Grundsatz: sparsam mit Gesten.
- Q (Gerätetest, 2026-10-18): Wie wird gespielt außer per Touch? → A: Gleichwertig über drei Quellen:
  das Controller-Quadrat (Touch), einen Game-Controller (Bluetooth oder USB, Gamepad API) oder die
  Tastatur mit WASD = Steuerkreuz, J = A, K = B, Enter = Start, Leertaste = Select. Gamepad und Tastatur
  wirken auch, wenn das Controller-Quadrat nicht angezeigt wird.
- Q (Analyse, 2026-10-18): Bleibt das Wischen in der Kopfleiste für den View-Wechsel? → A: Nein. View-Wechsel
  nur über Pfeiltasten in der Kopfleiste, weil Gesten fehleranfällig sind. Das Briefing wurde angepasst.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - ROM laden und spielen (Priority: P1)

Die Nutzerin wählt eine ROM-Datei vom Gerät aus. Im Screen-Quadrat startet das Spiel, im
Controller-Quadrat bedient sie es per Touch (Steuerkreuz, A, B, Start, Select) oder per Tastatur.

**Why this priority**: Der lauffähige Emulator ist der Kern aller weiteren Meilensteine.

**Independent Test**: Ein freies Test-ROM laden, auf dem Screen erscheint das erwartete Bild,
Eingaben über das Controller-Quadrat wirken sich im Spiel aus.

**Acceptance Scenarios**:

1. **Given** die App ohne geladenes ROM, **When** eine gültige ROM-Datei vom Gerät gewählt wird,
   **Then** startet sie im Screen-Quadrat und ein `RomLoaded`-Ereignis wird veröffentlicht.
2. **Given** ein laufendes Spiel, **When** eine Taste im Controller-Quadrat gedrückt wird, **Then**
   reagiert das Spiel darauf wie auf die entsprechende Hardware-Taste.
3. **Given** ein laufendes Spiel, **When** mehrere Tasten gleichzeitig gedrückt werden (z. B.
   Richtung + A), **Then** werden alle gleichzeitig erkannt.
4. **Given** ein zuvor geladenes ROM, **When** die App neu geöffnet wird, **Then** kann es ohne
   erneute Dateiauswahl aus dem lokalen Speicher wieder gestartet werden.
5. **Given** ein laufendes Spiel, **When** ein Game-Controller (Bluetooth oder USB) eine Taste meldet
   oder auf der Tastatur WASD, J, K, Enter oder Leertaste gedrückt wird, **Then** reagiert das Spiel
   wie auf die entsprechende DMG-Taste, auch wenn das Controller-Quadrat nicht angezeigt wird. Ein
   verbundener Game-Controller wird in ROM Info angezeigt.

---

### User Story 2 - Eigene, kompatible Boot-ROM (Priority: P1)

Beim Start eines ROMs läuft die eigene DotMerlinGame-Boot-ROM mit eigenem Logo. Sie ist
kompatibel zur Nintendo-Boot-ROM des DMG-01: Danach befindet sich das System exakt in dem Zustand,
den die Original-Hardware nach dem Boot hinterlässt, und Spiele merken keinen Unterschied.

**Why this priority**: Rechtlich sauberer Boot ohne Nintendo-Boot-ROM und Grundlage der
Hardware-Treue.

**Independent Test**: Automatischer Vergleich von CPU- und I/O-Registern nach dem Boot mit den
Werten aus Pan Docs ("Power Up Sequence").

**Acceptance Scenarios**:

1. **Given** ein beliebiges gültiges ROM, **When** es mit eigener Boot-ROM gestartet wird, **Then**
   erscheint zuerst das eigene Logo und danach das Spiel.
2. **Given** die eigene Boot-ROM ist durchgelaufen, **When** CPU- und I/O-Register gelesen werden,
   **Then** stimmen sie mit den Pan-Docs-Werten für das DMG überein (automatischer Test).
3. **Given** ein beliebiges Test-ROM des Projekts, **When** es mit eigener Boot-ROM und ohne Boot-ROM
   (Direktstart) ausgeführt wird, **Then** ist das Verhalten ab dem Sprung nach `$0100`
   identisch (gleiche Bild- und Tonausgabe nach N Frames).
4. **Given** der optionale Modus "Hardware-nah" ist aktiv, **When** ein ROM mit verändertem
   Header-Logo oder falscher Header-Checksumme gestartet wird, **Then** bleibt das System wie die
   Original-Hardware stehen und die Oberfläche zeigt den Grund an.

---

### User Story 3 - Emulator als Dienst, Views nur als Beobachter (Priority: P2)

Screen- und Controller-Quadrat greifen nicht direkt auf den Emulator zu. Sie lesen den
Frame-Zustand und abonnieren diskrete Ereignisse; Eingaben laufen über den Aktionskanal. Ein
unsichtbarer View bekommt keine Aktualisierungen.

**Why this priority**: Setzt die in M0 definierten Verträge erstmals um und sichert spätere Views.

**Independent Test**: Vertragstests mit einem Test-View; Messung, dass ausgeblendete Views keine
Updates verarbeiten.

**Acceptance Scenarios**:

1. **Given** ein laufender Emulator, **When** ein View über den Frame-Zustand liest, **Then**
   erhält er Register, Flags, Zyklen und geänderte Speicherbereiche des aktuellen Frames.
2. **Given** ein View ist nicht sichtbar, **When** Frames veröffentlicht werden, **Then** verarbeitet
   er sie nicht.
3. **Given** die Veröffentlichungsrate wird reduziert oder auf "nur auf Anforderung" gestellt,
   **When** der Emulator läuft, **Then** aktualisieren sich die Views entsprechend seltener, ohne
   dass der Emulator selbst langsamer läuft.
4. **Given** ein Emulator-Lauf, **When** Pause, Fortsetzen oder Zurücksetzen über den
   Aktionskanal ausgelöst wird, **Then** reagiert der Emulator entsprechend.

---

### User Story 4 - Ton wie auf dem DMG-01 (Priority: P1)

Die Nutzerin hört die Musik und Soundeffekte des Spiels, wie sie der Original-Game-Boy mit seinen
vier Tonkanälen erzeugt. Sie kann den Ton jederzeit stumm schalten und die Lautstärke einstellen.

**Why this priority**: Ton gehört zum DMG-01 und zu jedem Spiel; ohne Ton ist die Emulation unvollständig.

**Independent Test**: Test-ROM mit bekannter Tonausgabe abspielen; automatischer Vergleich der
erzeugten Audiodaten mit einer Referenz, manuelle Hörprobe am Gerät.

**Acceptance Scenarios**:

1. **Given** ein Spiel mit Musik, **When** es läuft, **Then** ist der Ton hörbar und synchron zum Bild.
2. **Given** die App wurde gerade geöffnet, **When** das erste Mal getippt wird, **Then** wird die
   Tonausgabe freigegeben (Browser verlangen dafür eine Nutzeraktion).
3. **Given** laufender Ton, **When** stumm geschaltet wird, **Then** verstummt er sofort, der
   Emulator läuft unverändert weiter.
4. **Given** der Emulator ist pausiert oder der Tab im Hintergrund, **When** der Zustand geprüft
   wird, **Then** gibt es keinen Ton und keine Knackser beim Fortsetzen.
5. **Given** ein Test-ROM, das jeden der vier Tonkanäle einzeln anspricht, **When** es läuft,
   **Then** ist jeder Kanal einzeln hörbar bzw. in den Audiodaten nachweisbar.

---

### User Story 5 - Spielen auf E-Ink-Geräten (Priority: P2)

Auf einem E-Ink-Gerät schaltet die Nutzerin den Screen-View in den E-Ink-Modus: Das Bild wird mit
reduzierter Rate aktualisiert, die vier Graustufen werden kontrastreich abgebildet, optional mit
Dithering. Das Spiel selbst läuft mit normaler Geschwindigkeit und normalem Ton weiter.

**Why this priority**: E-Ink-Tauglichkeit ist ein Qualitätsziel; der Screen-View ist der einzige
View mit schnell bewegtem Inhalt.

**Independent Test**: E-Ink-Modus einschalten, Anzahl der Bildaktualisierungen pro Sekunde messen
und mit der Emulationsgeschwindigkeit vergleichen; Graustufen-Screenshot prüfen.

**Acceptance Scenarios**:

1. **Given** ein laufendes Spiel, **When** der E-Ink-Modus des Screen-Views eingeschaltet wird,
   **Then** wird das Bild nur noch mit der eingestellten reduzierten Rate neu gezeichnet, die
   Emulation läuft weiter mit voller Geschwindigkeit.
2. **Given** der E-Ink-Modus, **When** das Bild dargestellt wird, **Then** sind die vier
   Graustufen des DMG-01 klar unterscheidbar (kontrastreiches Mapping, optional Dithering).
3. **Given** der E-Ink-Modus, **When** die App neu geladen wird, **Then** bleibt der Modus samt
   Einstellungen erhalten.
4. **Given** ein Gerät, auf dem der E-Ink-Modus nie eingeschaltet wurde, **When** der Screen-View zum
   ersten Mal geöffnet wird, **Then** startet er im Normalmodus, und der E-Ink-Modus lässt sich im
   Screen-View mit einem Schalter aktivieren.

---

### User Story 6 - Wechsel der View-Inhalte über die Kopfleiste (Priority: P3)

Die Nutzerin belegt die zwei Slots frei mit den Views Screen, Controller, ROM Info und Memory Map
und kann sie über die Pfeiltasten in der Kopfleiste wechseln (keine Wischgeste). Die Belegung bleibt nach Neustart erhalten.

**Why this priority**: Erstes reales Nutzen des Rasters, aber nicht kritisch für den Emulator.

**Independent Test**: Slot-Inhalt wechseln, App neu laden, Belegung ist unverändert.

**Acceptance Scenarios**:

1. **Given** ein Slot mit Screen, **When** die Pfeiltaste in der Kopfleiste getippt wird, **Then**
   zeigt der Slot sofort den nächsten View.
2. **Given** eine geänderte Belegung, **When** die App neu geladen wird, **Then** ist die Belegung
   wiederhergestellt; Emulatorzustand und ROM liegen getrennt davon.

---

### User Story 7 - Einzelnes Quadrat vergrößern (Priority: P2)

Die Nutzerin vergrößert ein Quadrat per Zoom-Schalter in der Kopfleiste auf die ganze Fläche, z. B.
den Screen auf einem kleinen Handy. Erneutes Betätigen des Schalters stellt das Raster wieder her. Die
Funktion gehört zum Raster und gilt für jeden View. Es gibt bewusst keine Zoom-Geste (sparsam mit
Gesten).

**Why this priority**: Kleine Displays und E-Ink-Geräte profitieren sofort; Editor und
Disassembly (M2/M3) nutzen dieselbe Funktion.

**Independent Test**: Quadrat per Zoom-Schalter vergrößern und zurückschalten;
Raster und Inhalte bleiben unverändert erhalten.

**Acceptance Scenarios**:

1. **Given** das Raster mit mehreren Slots, **When** der Zoom-Schalter in der Kopfleiste eines Slots
   betätigt wird, **Then** füllt er sofort (ohne Animation) die gesamte Rasterfläche, die anderen Slots
   sind ausgeblendet.
2. **Given** ein vergrößerter Slot, **When** der Zoom-Schalter erneut betätigt wird, **Then** erscheint
   wieder das vorherige Raster.
3. **Given** ein vergrößerter Screen-View, **When** das Spiel läuft, **Then** läuft die Emulation
   ununterbrochen weiter; ausgeblendete Views erhalten keine Frame-Updates.
4. **Given** ein vergrößerter Slot, **When** die App neu geladen wird, **Then** ist er weiterhin
   vergrößert (gespeichert im Layout-Zustand).
5. **Given** ein beliebiger Slot, **When** doppelt auf seinen Inhalt getippt wird, **Then** ändert sich
   die Größe nicht (keine Zoom-Geste; im Controller bleibt es eine Spieleingabe).

---

### User Story 8 - ROM-Speicherkonzept verstehen (Priority: P2)

Die Nutzerin schaut sich ein bestehendes ROM an. Der View „ROM Info“ zeigt ihr, was im Header des
geladenen ROMs steht: Titel, Cartridge-Typ, ROM-Größe mit Anzahl der ROM-Bänke und RAM-Größe. Der
View „Memory Map“ zeigt, wie der Adressraum des DMG-01 aufgeteilt ist. So versteht sie, wo das ROM
im Adressraum liegt und dass größere ROMs aus mehreren Bänken bestehen, von denen immer eine in
den umschaltbaren Bereich eingeblendet ist.

**Why this priority**: Da in M1 bestehende ROMs angeschaut werden, ist das Speicherkonzept die
Grundlage für Editor und Disassembly in M2/M3.

**Independent Test**: Ein freies Test-ROM laden; „ROM Info“ zeigt die erwarteten Header-Werte,
„Memory Map“ die Bereichsübersicht mit der passenden Bankanzahl.

**Acceptance Scenarios**:

1. **Given** ein geladenes ROM, **When** der View „ROM Info“ geöffnet wird, **Then** zeigt er
   Titel, Cartridge-Typ, ROM-Größe, Anzahl der ROM-Bänke und RAM-Größe aus dem Header.
2. **Given** der View „Memory Map“, **When** er angezeigt wird, **Then** enthält er eine Übersicht
   der DMG-Adressbereiche, in der fester ROM-Bereich (Bank 0) und umschaltbarer ROM-Bereich
   (Bank 1 bis n, n aus dem Header des geladenen ROMs) unterscheidbar sind.
3. **Given** kein ROM ist geladen, **When** die Views geöffnet werden, **Then** zeigt „Memory Map“
   die Bereichsübersicht ohne Bankanzahl und „ROM Info“ einen Hinweis, dass kein ROM geladen ist,
   samt der Möglichkeit, eines zu laden.
4. **Given** der View „ROM Info“, **When** er angezeigt wird, **Then** bietet er ROM laden,
   Startmodus (eigene Boot-ROM, Direktstart, optional „Hardware-nah“), Pause/Fortsetzen,
   Zurücksetzen und Lautstärke an.

---

### Edge Cases

- Datei ist kein gültiges ROM (zu klein, falsche Größe, beschädigt): klare Fehlermeldung, der
  Emulator bleibt im vorherigen Zustand.
- ROM nutzt einen Cartridge-Typ (MBC), den der Core nicht unterstützt: verständliche Meldung statt
  Absturz. Für ROM ohne MBC, MBC1, MBC3 und MBC5 darf das nicht auftreten.
- Game-Boy-Color-ROM: Reine Color-ROMs werden mit verständlicher Meldung abgelehnt. ROMs, die
  auch auf dem DMG-01 laufen, werden im DMG-Modus ausgeführt; Color-Funktionen werden nie emuliert.
- Browser blockiert die Tonausgabe bis zur ersten Nutzeraktion: Das Spiel startet trotzdem, ein
  Hinweis bietet das Einschalten des Tons an.
- Gerät ohne Audioausgabe oder stumm geschaltet: Emulation läuft unverändert.
- Tab geht in den Hintergrund oder das Gerät sperrt: Emulator pausiert und setzt ohne Zeitsprung fort.
- Es ist bereits ein ROM gespeichert und ein neues wird gewählt: Hinweis, dass das gespeicherte
  ROM samt Spielstand ersetzt wird und der Spielstand verloren geht (die ROM-Datei selbst liegt weiter
  auf dem Gerät). Danach wird es
  ersetzt.
- App wird geschlossen, neu geladen oder geht in den Hintergrund, während ein Spiel mit
  batteriegepuffertem Cartridge-RAM läuft: Der Spielstand ist danach erhalten.
- Speicher des Browsers ist voll: Meldung, ROM kann trotzdem einmalig gestartet werden.
- Mehrfaches Tippen auf Controller-Tasten in schneller Folge: keine verlorenen Eingaben.
- Modus "Hardware-nah" aus und ROM mit ungültigem Header: ROM startet trotzdem, Hinweis wird angezeigt.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Das System MUSS ROM-Dateien vom Gerät laden und im Emulator ausführen. Mindestens
  unterstützt werden die Cartridge-Typen ROM ohne MBC, MBC1, MBC3 und MBC5 (Header-Codes laut Pan
  Docs); jeder dieser Typen wird mit einem freien oder selbst gebauten Test-ROM getestet. Andere
  Typen dürfen laufen, sind aber nicht zugesichert.
- **FR-002**: Das zuletzt geladene ROM MUSS lokal im Browser gespeichert und ohne erneute
  Dateiauswahl wieder startbar sein; es verlässt das Gerät nie. Es wird immer genau ein ROM
  gehalten: Ein neu geladenes ROM ersetzt das gespeicherte, nachdem die Oberfläche darauf
  hingewiesen hat.
- **FR-003**: Der Emulator MUSS als Dienst ohne eigene UI laufen und ausschließlich über den
  Emulator-Port angesprochen werden.
- **FR-004**: Der Emulator MUSS Frame-Snapshots und diskrete Ereignisse über die in M0 definierten
  Kanäle veröffentlichen; die Rate MUSS konfigurierbar sein.
- **FR-005**: Es MUSS ein Screen-View das Bild des Emulators mit voller Bildrate darstellen.
- **FR-006**: Es MUSS ein Controller-View alle acht Tasten (Steuerkreuz, A, B, Start, Select) per
  Touch bedienbar machen, mit Mehrfachdruck. Zusätzlich MÜSSEN, unabhängig davon, ob der Controller-View
  angezeigt wird, (a) die Tastatur mit WASD = Steuerkreuz, J = A, K = B, Enter = Start,
  Leertaste = Select und (b) Game-Controller über die Gamepad API (Bluetooth oder USB, Standard-Mapping
  inkl. linkem Analogstick als Steuerkreuz) dieselben Tasten auslösen.
- **FR-007**: Das System MUSS eine eigene DotMerlinGame-Boot-ROM mit eigenem Logo enthalten, die
  nur im Emulator verwendet wird, selbst geschrieben ist und keinen Code oder Daten der
  Nintendo-Boot-ROM enthält.
- **FR-008**: Die eigene Boot-ROM MUSS kompatibel zur Nintendo-Boot-ROM des DMG-01 sein: Nach
  ihrem Ablauf MÜSSEN CPU- und I/O-Register den Pan-Docs-Werten ("Power Up Sequence", nur die
  Spalte „DMG“; DMG0 und MGB sind kein Ziel) entsprechen und die Ausführung MUSS bei `$0100` fortgesetzt werden; dies MUSS automatisch
  getestet werden.
- **FR-009**: Das System MUSS zwei Startmodi unterstützen: eigene Boot-ROM und Direktstart ohne
  Boot-ROM. Fremde Boot-ROMs werden nicht eingebunden.
- **FR-010**: Ein Test MUSS belegen, dass jedes Test-ROM des Projekts (selbst gebaut oder frei
  lizenziert) in beiden Startmodi identisch läuft (Constitution VII).
- **FR-011**: Ein optionaler Modus "Hardware-nah" MUSS Header-Logo und Header-Checksumme wie die
  Original-Boot-ROM prüfen und bei Abweichung anhalten.
- **FR-012**: Der Emulator MUSS Pause, Fortsetzen und Zurücksetzen über den Aktionskanal unterstützen.
- **FR-013**: Views MÜSSEN über die Kopfleiste tauschbar sein; die Slot-Belegung MUSS getrennt vom
  Projekt- und Emulatorzustand gespeichert werden.
- **FR-014**: Die Wahl des Emulator-Cores MUSS als ADR-0006 nach Vergleich der Debug-Hooks
  dokumentiert werden; nur Cores mit permissiver, geprüfter Lizenz kommen infrage. ADR-0004
  (Boot-ROM-Strategie) MUSS ebenfalls vorliegen.
- **FR-015**: Der gewählte Core MUSS mit Herkunftsnachweis in `third_party/` und
  `THIRD_PARTY_LICENSES` eingetragen sein.
- **FR-016**: Die UI-Regeln (E-Ink-first) MÜSSEN für alle neuen UI-Teile gelten; nur der
  Spielinhalt im Screen-View ist davon ausgenommen.
- **FR-017**: Das System MUSS ausschließlich den DMG-01 emulieren. Reine Game-Boy-Color-ROMs MÜSSEN
  mit Meldung abgelehnt werden; kompatible ROMs laufen im DMG-Modus.
- **FR-018**: Das System MUSS den Ton des DMG-01 (vier Tonkanäle) synchron zum Bild ausgeben.
- **FR-019**: Ton MUSS stumm schaltbar und in der Lautstärke einstellbar sein; die Einstellung
  bleibt erhalten. Die Tonausgabe MUSS nach der ersten Nutzeraktion freigegeben werden.
- **FR-020**: Bei Pause, Hintergrund-Tab oder Gerätesperre MUSS der Ton verstummen und beim
  Fortsetzen ohne Störgeräusche weiterlaufen.
- **FR-021**: Der Screen-View MUSS einen E-Ink-Modus haben: reduzierte, einstellbare
  Aktualisierungsrate, kontrastreiches Graustufen-Mapping und optionales Dithering. Emulation und
  Ton laufen dabei mit voller Geschwindigkeit weiter.
- **FR-022**: Der E-Ink-Modus des Screen-Views MUSS auf der drosselbaren Rate des
  Frame-Zustand-Kanals aufbauen, ohne Sonderlogik im Emulator; seine Einstellungen bleiben erhalten.
- **FR-023**: Jeder belegte Slot MUSS in seiner Kopfleiste einen Zoom-Schalter haben, mit dem er sich
  auf die gesamte Rasterfläche vergrößern und ebenso zurückschalten lässt, sofort und ohne Animation.
  Es gibt keine Zoom-Geste (kein Doppeltipp). Die Funktion liegt im Raster (`src/app/layout`), nicht in einzelnen Views.
- **FR-024**: Welcher Slot vergrößert ist, MUSS ausschließlich im Layout-Zustand gespeichert werden;
  ausgeblendete Slots gelten als nicht sichtbar (keine Frame-Updates).
- **FR-025**: Es MUSS einen View „Memory Map“ geben, der statisch die Adressbereiche des DMG-01
  anzeigt, inklusive fester ROM-Bank 0 und umschaltbarer ROM-Bank mit der Bankanzahl des geladenen
  ROMs. Der View „ROM Info“ MUSS die Header-Daten des geladenen ROMs anzeigen (Titel,
  Cartridge-Typ, ROM-Größe mit Bankanzahl, RAM-Größe). Bereichsgrenzen und Bedeutung der
  Header-Felder stammen aus Pan Docs ("Memory Map", "The Cartridge Header") und werden getestet.
  Keiner der beiden Views zeigt Live-Speicherinhalt.
- **FR-026**: Bei Cartridge-Typen mit batteriegepuffertem RAM (laut Header) MUSS dessen Inhalt
  lokal gespeichert und beim nächsten Start desselben ROMs wiederhergestellt werden, spätestens
  bei Pause, Hintergrund-Tab oder Schließen der App. Der Spielstand gehört zum gespeicherten ROM
  und wird mit ihm ersetzt. Export als Datei und die MBC3-Echtzeituhr sind nicht Teil von M1.
- **FR-027**: Der View „ROM Info“ MUSS die Bedienelemente außerhalb des Gamepads bündeln: ROM
  laden, Startmodus (eigene Boot-ROM, Direktstart, „Hardware-nah“), Pause/Fortsetzen,
  Zurücksetzen und Lautstärke. Alle Aktionen laufen über den Aktionskanal. Zusätzlich MUSS die
  Kopfleiste des Screen-Views einen Stumm-Schalter haben.

### Key Entities

- **ROM**: Binärdatei eines Spiels; in M1 Laufzeit-Eingabe, ab M2 nur noch Build-Ergebnis. Es
  existiert immer höchstens ein gespeichertes ROM.
- **Boot-ROM-Modus**: eigene Boot-ROM oder Direktstart; optional "Hardware-nah".
- **Audioeinstellungen**: stumm/laut, Lautstärke.
- **Screen-Einstellungen**: normaler Modus oder E-Ink-Modus mit Rate, Graustufen-Mapping, Dithering.
- **Emulator-Zustand**: Register, Flags, Speicher, Zyklen; veröffentlicht als Frame-Snapshot.
- **ROM-Header-Info**: aus dem Header gelesene Werte (Titel, Cartridge-Typ, ROM-Größe,
  Anzahl ROM-Bänke, RAM-Größe); abgeleitet aus dem ROM, nicht separat gespeichert.
- **Spielstand**: Inhalt des batteriegepufferten Cartridge-RAMs; gehört zum einen gespeicherten
  ROM, wird mit ihm ersetzt; getrennt von Layout und Emulatorzustand.
- **Eingabezustand**: gedrückte Tasten des Controllers.
- **Layout**: Slot-Belegung und ggf. vergrößerter Slot, getrennt von ROM und Emulatorzustand.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % der Boot-Zustandstests (alle Register laut Pan Docs, Spalte „DMG“) sind grün.
- **SC-002**: Jedes Test-ROM des Projekts erzeugt mit eigener Boot-ROM und im Direktstart nach derselben
  Anzahl Frames dieselbe Bild- und Tonausgabe.
- **SC-003**: Auf dem im Abnahmeprotokoll benannten Mittelklasse-Smartphone läuft der Emulator mit
  Screen und Controller mit voller Geschwindigkeit (ca. 60 Bilder pro Sekunde): Die Rechenzeit pro
  Frame liegt im 95. Perzentil unter 16,7 ms (über 5 Minuten gemessen).
- **SC-004**: Zwischen Tastendruck im Controller-Quadrat und Reaktion im Spiel vergeht höchstens
  ein Frame plus Anzeigeverzögerung.
- **SC-005**: Ein ROM ist von der Dateiauswahl bis zum laufenden Spiel in unter 5 Sekunden gestartet.
- **SC-006**: Ausgeblendete Views verarbeiten 0 Frame-Updates.
- **SC-007**: Der Ton läuft auf dem benannten Smartphone über 10 Minuten Spielzeit ohne Aussetzer und
  synchron zum Bild: Die Zähler für Pufferunterlauf und -überlauf bleiben bei 0, die Hörprobe ist
  unauffällig.
- **SC-008**: Im E-Ink-Modus wird das Bild höchstens mit der eingestellten Rate neu gezeichnet,
  während die Emulation weiterhin ca. 60 Frames pro Sekunde berechnet.

## Assumptions

- In M1 werden ROMs direkt ausgeführt, weil Assembler (M2) und Disassembler (M3) noch fehlen. Das
  ist eine Übergangslösung zu Prinzip I der Constitution ("Quelltext als einzige Wahrheit") und
  wird in ADR-0004/-0005 festgehalten. Ab M3 werden importierte ROMs disassembliert.
- Zielplattform ist ausschließlich der DMG-01 (Original-Game-Boy). Game Boy Color wird weder
  unterstützt noch emuliert (Entscheidung des Projektinhabers). Die Tonausgabe ist Pflicht und
  geht in die Core-Auswahl (ADR-0006) ein.
- Ob die Gesamtlaufzeit und das Timing der eigenen Boot-ROM der Nintendo-Boot-ROM entsprechen
  müssen, wird in ADR-0004 entschieden; verbindlich ist der Endzustand laut Pan Docs.
- Test-ROMs sind selbst gebaut oder frei lizenziert; ihre Lizenz wird vor Aufnahme geprüft. Sind
  sie nicht im Repo erlaubt, werden sie im Test selbst erzeugt oder lokal bereitgestellt.
- Fremde Boot-ROMs (z. B. von SameBoy) werden nicht eingebunden. Das weicht vom ursprünglichen
  Briefing ab; das Briefing wurde entsprechend angepasst.
- Debugger-Funktionen (Breakpoints, Step im UI) gehören zu M4; der Port muss sie nur vorsehen.
- M1 hat nur ein Theme (E-Ink-first). Eine automatische Voreinstellung des E-Ink-Modus über einen
  Theme-Schalter ist nicht Teil von M1.
