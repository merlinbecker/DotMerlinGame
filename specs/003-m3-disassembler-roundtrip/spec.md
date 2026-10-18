# Feature Specification: M3 – Disassembler und Roundtrip

**Feature Branch**: `feature/firstSteps`

**Created**: 2026-10-18

**Status**: Draft

**Input**: Meilenstein M3 aus `docs/BOOTSTRAP-BRIEFING.md`, Abschnitt 8: ROM-Import → Quelltext.
Konservative Analyse: Einstiegspunkte (Reset-Vektoren, Interrupts, `$0100`), Sprüngen folgen,
Unsicheres bleibt `db`/`dw`. Abnahme: Roundtrip ROM → Quelltext → Assemblieren ergibt
byte-identisch das Original.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - ROM als Projekt importieren (Priority: P1)

Die Nutzerin wählt eine ROM-Datei. Das System erzeugt daraus ein neues Projekt mit Quelltext, das
sie im Editor lesen, bauen und ausführen kann. Ab jetzt arbeitet sie nur noch am Quelltext.

**Why this priority**: Setzt das Prinzip "Quelltext als einzige Wahrheit" auch für fremde ROMs um.

**Independent Test**: ROM importieren, neues Projekt erscheint, Build läuft im Emulator.

**Acceptance Scenarios**:

1. **Given** eine gültige ROM-Datei, **When** sie importiert wird, **Then** entsteht ein neues
   Projekt mit Quelltext und ein `ProjectChanged`-Ereignis wird veröffentlicht.
2. **Given** das importierte Projekt, **When** es gebaut wird, **Then** ist das Ergebnis
   byte-identisch zum Original-ROM.
3. **Given** das importierte Projekt, **When** es gestartet wird, **Then** läuft der Build, nicht
   das Original-ROM; das Original wird nicht als Projektbestandteil aufbewahrt.

---

### User Story 2 - Konservative, nachvollziehbare Analyse (Priority: P1)

Der erzeugte Quelltext enthält nur dort Befehle, wo der Code sicher erreichbar ist (ab
Reset-Vektoren, Interrupt-Vektoren und `$0100`, Sprüngen und Aufrufen folgend). Alles andere bleibt
als Datenbytes (`db`/`dw`) erhalten. Header und erkannte Bereiche sind kommentiert.

**Why this priority**: Ein falsch als Code gedeuteter Datenbereich würde den Roundtrip oder das
Verständnis verfälschen.

**Independent Test**: Selbst gebautes ROM mit bekannter Code-/Daten-Aufteilung importieren und mit
dem Original-Quelltext vergleichen.

**Acceptance Scenarios**:

1. **Given** ein ROM, **When** es analysiert wird, **Then** beginnt die Code-Erkennung an den
   Reset-Vektoren, den Interrupt-Vektoren und `$0100` und folgt nur Sprüngen und Aufrufen mit
   statisch bekanntem Ziel.
2. **Given** ein Bereich, der nicht sicher als Code erkannt wurde, **When** der Quelltext erzeugt
   wird, **Then** erscheint er als `db`/`dw`.
3. **Given** ein Sprungziel innerhalb des Codes, **When** der Quelltext erzeugt wird, **Then**
   erhält es ein automatisch benanntes Label und der Sprung verweist darauf.
4. **Given** der Cartridge-Header, **When** der Quelltext erzeugt wird, **Then** ist er als eigener,
   kommentierter Abschnitt erkennbar.
5. **Given** ein ROM mit mehreren Speicherbänken, **When** es importiert wird, **Then** ist jede
   Bank als eigener Abschnitt im Quelltext enthalten und der Roundtrip bleibt byte-identisch.

---

### User Story 3 - Roundtrip als dauerhafter Qualitätsnachweis (Priority: P2)

Eine automatische Testsuite prüft für alle freien Homebrew-ROMs und selbst gebauten ROMs im
Test-Set, dass ROM → Quelltext → Build byte-identisch ist. Kommerzielle ROMs können lokal mit
demselben Test geprüft werden, landen aber nie im Repo.

**Why this priority**: Macht Abnahme und spätere Regressionen automatisch prüfbar.

**Independent Test**: Testsuite laufen lassen; lokaler Lauf mit eigenen ROMs über ein nicht
versioniertes Verzeichnis.

**Acceptance Scenarios**:

1. **Given** das Test-Set aus freien und selbst gebauten ROMs, **When** die Roundtrip-Tests
   laufen, **Then** sind 100 % byte-identisch.
2. **Given** lokale ROMs in einem ignorierten Verzeichnis, **When** der lokale Roundtrip-Test
   gestartet wird, **Then** werden sie geprüft, ohne dass ROMs oder Disassemblies in die
   Versionsverwaltung gelangen.

---

### Edge Cases

- ROM mit ungültigem Header oder ungewöhnlicher Größe: Import ist trotzdem möglich, Hinweis im Quelltext.
- Indirekte Sprünge (z. B. Sprungtabellen, `jp hl`): Ziele gelten als unsicher, Bereiche bleiben
  Daten, sofern sie nicht anderweitig erreicht werden.
- Code, der sich selbst verändert oder in den RAM kopiert wird: wird nicht als Code im ROM gedeutet.
- Befehle, die über eine Bankgrenze reichen: werden als Daten behandelt.
- Ungültige Opcodes in vermutetem Code: Analyse an dieser Stelle abbrechen, Rest bleibt Daten.
- Leere oder aufgefüllte Bereiche (z. B. lange Folgen gleicher Bytes): kompakt, aber
  byte-identisch darstellbar.
- Sehr große ROMs: Import bleibt bedienbar und zeigt Fortschritt ohne Animation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Das System MUSS ROM-Dateien einmalig in ein neues Projekt mit Quelltext umwandeln.
- **FR-002**: Die Analyse MUSS an Reset-Vektoren, Interrupt-Vektoren und `$0100` beginnen und
  ausschließlich statisch bekannten Sprüngen und Aufrufen folgen.
- **FR-003**: Nicht sicher als Code erkannte Bereiche MÜSSEN als `db`/`dw` ausgegeben werden.
- **FR-004**: Erkannte Sprung- und Aufrufziele MÜSSEN automatisch benannte Labels erhalten.
- **FR-005**: Der erzeugte Quelltext MUSS mit dem Assembler aus M2 ohne manuelle Änderung zu einem
  byte-identischen ROM gebaut werden können.
- **FR-006**: Der Cartridge-Header MUSS als eigener, kommentierter Abschnitt erzeugt werden.
- **FR-007**: ROMs mit mehreren Bänken MÜSSEN vollständig und bankweise abgebildet werden.
- **FR-008**: Nach dem Import MUSS das Projekt wie jedes andere bearbeitet, gebaut und exportiert
  werden können; das Original-ROM wird nicht im Projekt aufbewahrt.
- **FR-009**: Es MUSS eine automatische Roundtrip-Testsuite mit freien und selbst gebauten ROMs geben.
- **FR-010**: Es MUSS einen lokalen Roundtrip-Lauf für eigene ROMs aus einem ignorierten
  Verzeichnis geben; ROMs und deren Disassemblies DÜRFEN NIE versioniert werden.
- **FR-011**: Befehlssatz und Opcode-Längen MÜSSEN aus Pan Docs bzw. der RGBDS-Dokumentation
  belegt sein, nicht aus dem Gedächtnis.

### Key Entities

- **Import-Vorgang**: Eingabe-ROM, Analyseergebnis, erzeugtes Projekt.
- **Analyseergebnis**: Einstiegspunkte, als Code erkannte Bereiche, Datenbereiche, Labels.
- **Label**: Automatisch vergebener Name für eine Adresse (mit Bank).
- **Roundtrip-Testfall**: ROM, erzeugter Quelltext, Build-Ergebnis, Vergleich.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % der ROMs im Test-Set ergeben im Roundtrip ein byte-identisches ROM.
- **SC-002**: Bei selbst gebauten Test-ROMs mit bekannter Aufteilung wird 0 % Datenbereich
  fälschlich als Code ausgegeben.
- **SC-003**: Ein ROM mit 32 KiB ist auf einem Mittelklasse-Smartphone in unter 10 Sekunden importiert.
- **SC-004**: Ein ROM mit 1 MiB ist in unter 60 Sekunden importiert, die UI bleibt währenddessen bedienbar.
- **SC-005**: Kein ROM und keine Disassembly kommerzieller Spiele gelangt in die Versionsverwaltung
  (automatisch geprüft durch Ignorier-Regeln und CI).

## Assumptions

- Die Analyse ist bewusst konservativ; Heuristiken zur Erkennung weiterer Codebereiche (z. B.
  Sprungtabellen) sind nicht Teil von M3.
- Labels werden automatisch benannt; manuelles Umbenennen ist normale Quelltextbearbeitung.
- Symbol- und Map-Dateien aus M2 werden für die Roundtrip-Prüfung, nicht für die Analyse genutzt.
- Das Test-Set enthält nur selbst gebaute ROMs und frei lizenzierte Homebrew-ROMs, deren Lizenz
  die Aufnahme ins Repo erlaubt und per ADR festgehalten ist; sonst werden sie nur lokal genutzt.
- Game-Boy-Color-spezifische ROMs sind nicht Ziel von M3, werden aber byte-identisch abgebildet,
  da Unsicheres als Daten erhalten bleibt.
