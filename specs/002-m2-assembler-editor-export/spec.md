# Feature Specification: M2 – Assembler, Editor, Export

**Feature Branch**: `feature/firstSteps`

**Created**: 2026-10-18

**Status**: Draft

**Input**: Meilenstein M2 aus `docs/BOOTSTRAP-BRIEFING.md`, Abschnitt 8: RGBDS-WASM,
Editor-Quadrat, Build-Pipeline (`rgbasm` → `rgblink` → `rgbfix`), `.gb`-Export, Symbol-/Map-Datei,
ZIP-Export und -Import von Projekten, Beispielprojekt.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quelltext schreiben, bauen und ausführen (Priority: P1)

Der Nutzer öffnet ein Projekt, bearbeitet den Assembler-Quelltext im Editor-Quadrat und startet
den Build. Das Ergebnis läuft sofort im Screen-Quadrat. Fehler werden mit Datei und Zeile angezeigt.

**Why this priority**: Das ist der zentrale Arbeitsablauf der IDE: Assemblieren → Emulieren.

**Independent Test**: Beispielprojekt öffnen, Build starten, Spiel läuft; absichtlichen Fehler
einbauen, Fehlermeldung zeigt auf die richtige Zeile.

**Acceptance Scenarios**:

1. **Given** ein Projekt mit gültigem Quelltext, **When** der Build gestartet wird, **Then** werden
   Assemblieren, Linken und Header-Korrektur ausgeführt, ein `BuildFinished`-Ereignis wird
   veröffentlicht und das ROM startet im Emulator.
2. **Given** Quelltext mit Syntaxfehler, **When** der Build gestartet wird, **Then** schlägt er
   fehl, die Meldung nennt Datei und Zeile, und ein Tippen darauf springt im Editor zu dieser Zeile.
3. **Given** ein erfolgreicher Build, **When** die Build-Ergebnisse betrachtet werden, **Then**
   liegen ROM, Symbol-Datei und Map-Datei vor.
4. **Given** ein laufendes Spiel, **When** der Quelltext geändert und neu gebaut wird, **Then**
   läuft die neue Version, ohne dass die App neu geladen werden muss.

---

### User Story 2 - Hardware-taugliches `.gb` exportieren (Priority: P1)

Der Nutzer exportiert das gebaute Spiel als `.gb`-Datei, um es auf einer Flash-Cartridge auf
echter Hardware zu spielen.

**Why this priority**: Hardware-Treue des Exports ist ein Qualitätsziel.

**Independent Test**: Export des Beispielprojekts; automatische Prüfung von Header-Logo und
Header-Checksumme.

**Acceptance Scenarios**:

1. **Given** ein erfolgreicher Build, **When** "Als .gb exportieren" gewählt wird, **Then** lädt
   das Gerät eine `.gb`-Datei herunter.
2. **Given** eine exportierte Datei, **When** Header-Logo (`$0104–$0133`) und Header-Checksumme
   (`$014D`) geprüft werden, **Then** sind beide gültig.
3. **Given** ein fehlgeschlagener Build, **When** ein Export versucht wird, **Then** ist der
   Export nicht möglich und der Grund wird angezeigt.

---

### User Story 3 - Projekte lokal speichern, als ZIP sichern und wiederherstellen (Priority: P2)

Projekte werden automatisch lokal gespeichert. Der Nutzer kann ein Projekt als ZIP exportieren
und auf einem anderen Gerät oder nach dem Löschen wieder importieren.

**Why this priority**: Sicherung und Geräteumzug ohne Server.

**Independent Test**: Projekt als ZIP exportieren, lokal löschen, ZIP importieren, Build ergibt
byte-identisches ROM.

**Acceptance Scenarios**:

1. **Given** ein bearbeitetes Projekt, **When** die App geschlossen und neu geöffnet wird, **Then**
   sind alle Änderungen erhalten.
2. **Given** ein Projekt, **When** es als ZIP exportiert und anschließend wieder importiert wird,
   **Then** sind alle Quelltextdateien und Projekteinstellungen identisch und der Build ergibt ein
   byte-identisches ROM.
3. **Given** eine ZIP-Datei, die kein gültiges Projekt enthält, **When** sie importiert wird,
   **Then** wird sie abgelehnt, ohne bestehende Projekte zu verändern.
4. **Given** ein Projekt mit gleichem Namen existiert bereits, **When** ein ZIP importiert wird,
   **Then** wird nachgefragt, ob ersetzt oder als Kopie angelegt werden soll.

---

### User Story 4 - Mit einem Beispielprojekt starten (Priority: P3)

Ein neuer Nutzer legt ein Projekt aus dem mitgelieferten Beispiel an, baut es und sieht es laufen.

**Why this priority**: Einstieg und gleichzeitig Abnahmetest des Meilensteins.

**Independent Test**: Neues Projekt aus Beispiel anlegen, bauen, ausführen.

**Acceptance Scenarios**:

1. **Given** keine Projekte, **When** "Neues Projekt aus Beispiel" gewählt wird, **Then** entsteht
   ein Projekt, das ohne Änderung baut und im Emulator läuft.

---

### User Story 5 - Quelltext auf dem Handy und E-Ink-Gerät bearbeiten (Priority: P2)

Der Editor ist auf kleinen Touch-Screens und E-Ink-Geräten bedienbar: Hervorhebung ohne Farbe,
kein blinkender Cursor, Blättern statt Dauer-Scrollen, Vollbild über den Slot-Zoom des Rasters (M1).

**Why this priority**: Mobile-first und E-Ink-first sind Kernprinzipien.

**Independent Test**: Editor im Graustufen-Screenshot prüfen; Blättern und Vollbild bedienen.

**Acceptance Scenarios**:

1. **Given** Quelltext im Editor, **When** er angezeigt wird, **Then** sind Befehle, Labels,
   Kommentare und Zahlen ohne Farbe unterscheidbar (z. B. fett, kursiv, unterstrichen).
2. **Given** eine lange Datei, **When** weitergeblättert wird, **Then** springt die Ansicht
   seitenweise ohne Animation.
3. **Given** das Editor-Quadrat, **When** der Zoom-Schalter in der Kopfleiste (M1) genutzt wird, **Then**
   füllt der Editor die Rasterfläche; Doppeltipps im Textbereich dienen der Textauswahl.

---

### Edge Cases

- Build eines Projekts mit mehreren Quelltextdateien und Include-Dateien.
- Endlosschleife oder extrem großes Makro im Quelltext: Build bricht nach einer Zeitgrenze mit
  Meldung ab, die UI bleibt bedienbar.
- Speicher des Browsers ist voll: Speichern schlägt mit klarer Meldung fehl, kein Datenverlust im Editor.
- ZIP-Import mit Pfaden außerhalb des Projekts (z. B. `../`): wird abgewiesen.
- Sehr große ZIP-Datei oder ZIP-Bombe: Import bricht mit Meldung ab.
- Gerät offline: Build und Export funktionieren vollständig.
- Ungespeicherte Änderungen beim Wechsel des View-Inhalts: bleiben erhalten.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Das System MUSS Projekte aus mehreren Quelltextdateien verwalten und lokal im Browser
  speichern; Änderungen MÜSSEN automatisch gesichert werden.
- **FR-002**: Das System MUSS Quelltext lokal im Browser assemblieren, linken und den Header
  korrigieren, ohne Netzwerkzugriff.
- **FR-003**: Jeder erfolgreiche Build MUSS ROM, Symbol-Datei und Map-Datei erzeugen.
- **FR-004**: Build-Fehler MÜSSEN mit Datei, Zeile und Meldung angezeigt werden und zur Zeile im
  Editor führen.
- **FR-005**: Nach erfolgreichem Build MUSS das ROM im Emulator gestartet werden können; das ROM
  ist reines Build-Ergebnis und wird nicht als bearbeitbares Artefakt gespeichert.
- **FR-006**: Exportierte `.gb`-Dateien MÜSSEN gültiges Header-Logo und gültige Header-Checksumme
  haben; dies MUSS automatisch getestet werden.
- **FR-007**: Projekte MÜSSEN als ZIP exportiert und importiert werden können; Export und Reimport
  MÜSSEN verlustfrei sein.
- **FR-008**: Der ZIP-Import MUSS ungültige Archive, Pfade außerhalb des Projekts und übergroße
  Inhalte ablehnen.
- **FR-009**: Es MUSS ein Editor-View mit farbunabhängiger Syntax-Hervorhebung, ohne blinkenden
  Cursor und mit seitenweisem Blättern geben; Vollbild nutzt den Slot-Zoom des Rasters aus M1.
- **FR-010**: Es MUSS mindestens ein selbst geschriebenes, lizenzfreies Beispielprojekt in
  `examples/` geben, das als neues Projekt angelegt werden kann.
- **FR-011**: Die Einbindung des Assemblers MUSS lizenzrechtlich geprüft und in `third_party/` und
  `THIRD_PARTY_LICENSES` dokumentiert sein; der Weg (selbst gebaut oder fertiges Paket) wird per
  ADR entschieden.
- **FR-012**: Die verwendete ZIP-Bibliothek MUSS eine geprüfte permissive Lizenz haben und
  dokumentiert sein.

### Key Entities

- **Projekt**: Name, Quelltextdateien, Einstellungen; einzige Wahrheit für jeden Build.
- **Quelltextdatei**: Pfad im Projekt und Inhalt.
- **Build-Ergebnis**: ROM, Symbol-Datei, Map-Datei, Meldungen; jederzeit neu erzeugbar.
- **Build-Meldung**: Datei, Zeile, Schweregrad, Text.
- **Projekt-Archiv (ZIP)**: Austauschformat für ein Projekt.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Das Beispielprojekt baut, läuft im Emulator und hat gültigen Header (automatischer Test).
- **SC-002**: ZIP-Export und -Import des Beispielprojekts ergeben einen byte-identischen Build.
- **SC-003**: Der Build des Beispielprojekts dauert auf einem Mittelklasse-Smartphone unter 5 Sekunden.
- **SC-004**: 100 % der Build-Fehler im Test-Set zeigen auf die richtige Datei und Zeile.
- **SC-005**: Alle Funktionen dieses Meilensteins sind ohne Netzwerk nutzbar.
- **SC-006**: Eine exportierte `.gb`-Datei des Beispielprojekts startet auf echter Hardware
  (manuelle Abnahme, sofern Hardware verfügbar).

## Assumptions

- Ob RGBDS sauber als WASM gebaut werden kann oder ein gepflegtes Paket mit passender Lizenz
  existiert, ist ein offener Punkt aus dem Briefing und wird zu Beginn von M2 per ADR geklärt.
- Der Editor ist ein reiner Quelltext-Editor; Autovervollständigung und Symbolnavigation sind
  nicht Teil von M2.
- Projekte enthalten nur Text-Quelltext und Include-Dateien; Grafik- und Musik-Assets mit eigenen
  Editoren folgen in M5 und M6. Binäre Includes (`INCBIN`) sind erlaubt, wenn sie Teil des Projekts sind.
- Ein Beispielprojekt darf `hardware.inc` nur nutzen, wenn dessen Lizenz geprüft und dokumentiert ist.
- Debugging auf Quelltextzeilen nutzt die Symbol- und Map-Dateien erst in M4.
