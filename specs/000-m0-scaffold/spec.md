# Feature Specification: M0 – Gerüst

**Feature Branch**: `feature/firstSteps`

**Created**: 2026-10-18

**Status**: Abgenommen (2026-10-18, Version 0.2.0)

**Input**: Meilenstein M0 aus `docs/BOOTSTRAP-BRIEFING.md`, Abschnitt 8: Repo-Setup mit Build,
Test, CI, arc42-Skelett, ADR-Vorlage, `third_party/`, MIT-Lizenz, Secret-Scan, leerer Test-Rahmen
für Roundtrip und Boot-Zustand. Interfaces für View-Vertrag und Eventmodell. PWA nur mit Manifest,
ohne Service Worker. Design-Tokens und Schwarz-Weiß-Theme als Standard, Bewegung per Token
abschaltbar.

## Clarifications

### Session 2026-10-18

- Q: In welcher Sprache erscheinen die Texte der Oberfläche? → A: Nur Englisch, Texte direkt im Code (keine Übersetzungsinfrastruktur, um Komplexität zu sparen; nachträglich revidiert).
- Q: Welche Lizenzen sind für Abhängigkeiten erlaubt? → A: Freizügige Lizenzen: MIT, BSD-2-Clause, BSD-3-Clause, ISC, Apache-2.0, Zlib, 0BSD, CC0-1.0, Unlicense. Alles andere nur als Einzelausnahme mit ADR.
- Q: Auf welchen Browsern und Geräten muss die App für die Abnahme laufen? → A: Nur aktuelles Chrome (Android, Desktop, E-Ink-Geräte mit Android); automatische Tests nur in Chromium. Wichtig ist der funktionierende Rundlauf, nicht breite Kompatibilität. Weitere Browser sind nicht Teil der ersten Meilensteine (nachträglich revidiert).
- Q: Wie streng gilt der Lizenz-Check für Entwicklungswerkzeuge, die nicht ausgeliefert werden? → A: Zweistufig: ausgelieferter Code strikt gegen die Freigabeliste; Entwicklungswerkzeuge blockieren nur bei GPL, AGPL, LGPL, SSPL (alle Varianten) oder fehlender Lizenz, alles andere wird aufgelistet.
- Q: Kann die Adresszeile im mobilen Browser verschwinden? → A: Ja: Vollbild-Schalter in der Fußzeile (Fullscreen-API) und Manifest `display: fullscreen` für die installierte App (Ergänzung nach Umsetzung, Version 0.1.1).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lauffähige App-Shell auf dem Gerät (Priority: P1)

Der Projektinhaber öffnet die App auf einem Smartphone, Tablet oder E-Ink-Gerät. Er sieht eine
leere, schwarz-weiße Shell mit dem Raster aus quadratischen Slots (Hochformat: zwei untereinander,
Querformat: nebeneinander) und erkennt in der Fußzeile, welcher Stand (Commit-Hash) läuft.

**Why this priority**: Ohne startende Shell gibt es nichts, worauf spätere Views aufbauen können.
Die sichtbare Build-Version macht Gerätetests überhaupt erst verlässlich.

**Independent Test**: App im Browser öffnen, Fußzeile mit dem Commit-Hash des Builds vergleichen,
Gerät drehen.

**Acceptance Scenarios**:

1. **Given** ein frischer Build, **When** die App im Browser geöffnet wird, **Then** erscheint die
   Shell mit leeren Slots und der Commit-Hash des Builds steht in der Fußzeile.
2. **Given** die Shell im Hochformat, **When** das Gerät ins Querformat gedreht wird, **Then**
   ordnen sich die zwei Quadrate nebeneinander statt untereinander an, sofort und ohne Animation.
3. **Given** die App wurde geöffnet, **When** die registrierten Service Worker geprüft werden,
   **Then** ist keiner registriert.
4. **Given** die App, **When** sie zum Startbildschirm hinzugefügt werden soll, **Then** stellt
   sie Manifest und Icons bereit, damit sie installierbar ist.

---

### User Story 2 - E-Ink-taugliche Oberfläche (Priority: P1)

Die Shell ist auf einem E-Ink-Gerät vollständig bedienbar: schwarz auf weiß, hoher Kontrast,
keine Bewegung, große Touch-Ziele. Alle Farben, Abstände und Zeiten kommen aus zentralen
Design-Tokens; Bewegung lässt sich über ein Token komplett abschalten.

**Why this priority**: E-Ink-Tauglichkeit ist ein Qualitätsziel und Abnahmekriterium von M0.
Spätere Views erben diese Regeln nur, wenn sie von Anfang an gelten.

**Independent Test**: Screenshot der Shell in Graustufen umwandeln und prüfen, dass alle
Bedienelemente erkennbar und unterscheidbar sind; automatisch prüfen, dass keine Transitions oder
Animationen aktiv sind.

**Acceptance Scenarios**:

1. **Given** die Shell im Standard-Theme, **When** ein Screenshot in Graustufen umgewandelt wird,
   **Then** sind alle Bedienelemente, Zustände (z. B. Fokus, aktiv) und Texte weiterhin eindeutig
   erkennbar.
2. **Given** die Shell, **When** die Oberfläche auf aktive CSS-Transitions und -Animationen
   geprüft wird, **Then** werden keine gefunden.
3. **Given** das Bewegungs-Token ist auf "aus" gestellt oder das Gerät meldet reduzierte
   Bewegung, **When** die Shell bedient wird, **Then** erfolgt jeder Wechsel sofort.
4. **Given** eine Komponente der Shell, **When** ihr Stil geprüft wird, **Then** verwendet sie
   für Farben, Abstände und Zeiten ausschließlich Design-Tokens.

---

### User Story 3 - Verlässliches Arbeitsfundament für Entwicklung und Agenten (Priority: P2)

Ein Entwickler oder Coding-Agent klont das Repo, kann die App mit einem Befehl starten, bauen,
testen, linten und die komplette Prüfung wie in der CI lokal laufen lassen. Jede Änderung wird in
der CI automatisch auf Build, Lint, Typen, Tests, Secrets und Lizenzen geprüft.

**Why this priority**: Grundlage für "ohne grüne Tests und grüne CI ist nichts fertig".

**Independent Test**: Frischer Klon, Abhängigkeiten installieren, die dokumentierten Befehle
ausführen; Push auf einen Branch löst die CI aus, die grün wird.

**Acceptance Scenarios**:

1. **Given** ein frischer Klon, **When** die dokumentierten Befehle für Dev-Server, Build, Test,
   Lint und Gesamtprüfung ausgeführt werden, **Then** laufen alle ohne Fehler.
2. **Given** ein Push, **When** die CI läuft, **Then** prüft sie Build, Lint, Typen, Tests,
   Secret-Scan und Lizenz-Check und ist grün.
3. **Given** ein Commit mit einem absichtlich eingefügten Test-Secret, **When** der Secret-Scan
   läuft, **Then** schlägt er fehl.
4. **Given** eine Laufzeit-Abhängigkeit mit einer Lizenz außerhalb der Freigabeliste oder ein
   Entwicklungswerkzeug mit GPL-, AGPL-, LGPL- oder SSPL-Lizenz bzw. ohne erkennbare Lizenz,
   **When** der Lizenz-Check läuft, **Then** schlägt er fehl.
5. **Given** eine Datei mit ROM-Endung (z. B. `.gb`, `.gbc`) im Arbeitsverzeichnis, **When**
   `git status` ausgeführt wird, **Then** wird sie ignoriert.

---

### User Story 4 - Verbindliche Schnittstellen für spätere Meilensteine (Priority: P2)

Spätere Views und der Emulator bauen auf festgelegten Verträgen auf: dem View-Vertrag und den zwei
Eventkanälen (Frame-Zustand als Snapshot, diskrete Ereignisse als getypte Union). In M0 existieren
nur die Verträge und Test-Rahmen, noch keine Umsetzung.

**Why this priority**: Die Verträge verhindern, dass M1 und folgende Meilensteine Views und
Emulator direkt koppeln.

**Independent Test**: Typprüfung und Vertragstests laufen gegen eine Dummy-Implementierung.

**Acceptance Scenarios**:

1. **Given** der View-Vertrag, **When** ein Dummy-View dagegen implementiert wird, **Then** erhält
   er Größe, read-only abonnierbaren Emulator-Zustand, Projektzustand und einen Aktionskanal und
   liefert serialisierbaren Zustand, Titel und Icon.
2. **Given** der Kanal für diskrete Ereignisse, **When** ein Ereignis mit unbekanntem Typ
   veröffentlicht werden soll, **Then** lehnt die Typprüfung das ab.
3. **Given** der Frame-Zustand-Kanal, **When** seine Schnittstelle geprüft wird, **Then** erlaubt
   sie eine konfigurierbare Veröffentlichungsrate (volle Rate, reduziert, auf Anforderung).
4. **Given** die Test-Rahmen für Roundtrip und Boot-Zustand, **When** die Tests laufen, **Then**
   sind sie vorhanden, als ausstehend markiert und brechen die Testsuite nicht.

---

### User Story 5 - Dokumentations- und Lizenzgerüst (Priority: P3)

Wer das Repo öffnet, findet Briefing, arc42-Kapitel 1–5, 7 und 9, eine ADR-Vorlage, die ersten
ADRs zu bereits feststehenden Entscheidungen, die MIT-Lizenz und ein vorbereitetes
`third_party/`-Verzeichnis mit `THIRD_PARTY_LICENSES`.

**Why this priority**: Pflicht für die Definition of Done, aber ohne Laufzeitwirkung.

**Independent Test**: Dateien und Verzeichnisse auf Vorhandensein und Mindestinhalt prüfen.

**Acceptance Scenarios**:

1. **Given** das Repo, **When** `docs/` geprüft wird, **Then** existieren Briefing, arc42-Kapitel
   1–5, 7, 9 und eine ADR-Vorlage in `docs/adr/`.
2. **Given** das Repo, **When** die Lizenzdateien geprüft werden, **Then** gibt es `LICENSE` (MIT),
   `THIRD_PARTY_LICENSES` und `third_party/` mit einem Eintrag je verwendeter Fremdkomponente
   (Quelle, Version, Lizenz, Commit-Hash bzw. Paketversion).

---

### Edge Cases

- Mobiler Browser-Tab: Die Adresszeile lässt sich nur per Vollbild-Schalter ausblenden (Browser
  verlangen dafür ein Tippen); die Slots vergrößern sich danach sofort.

- Gerät meldet `prefers-reduced-motion`: Die Shell verhält sich identisch zum Bewegungs-Token "aus".
- Build außerhalb eines Git-Repos (z. B. aus einem Archiv): Statt Commit-Hash wird ein eindeutiger
  Platzhalter (`unknown`) angezeigt, der Build bricht nicht ab.
- Ein früher registrierter Service Worker einer anderen Version existiert noch im Browser: Die
  Shell registriert keinen neuen; der Umgang mit Altlasten ist Teil von M7.
- Sehr kleine Viewports (unter 320 px Breite): Die Shell bleibt bedienbar, Slots verkleinern sich,
  nichts scrollt horizontal.
- Große Screens: Die Shell ist für ein Raster bis 4x4 vorbereitet, belegt in M0 aber nur leere Slots.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Die App MUSS als Shell im Browser starten und ein Raster aus quadratischen, leeren
  Slots anzeigen (Hochformat untereinander, Querformat nebeneinander).
- **FR-002**: Jeder Slot MUSS eine Kopfleiste haben; der spätere Wechsel des View-Inhalts erfolgt
  ausschließlich darüber.
- **FR-003**: Die Oberfläche MUSS die Build-Version (Commit-Hash) dauerhaft sichtbar anzeigen.
- **FR-004**: Die App MUSS ein Web-App-Manifest mit Icons bereitstellen und DARF keinen Service
  Worker registrieren.
- **FR-005**: Das Standard-Theme MUSS schwarz auf weiß in Graustufen sein; Bedeutung DARF NICHT
  allein über Farbe vermittelt werden.
- **FR-006**: Farben, Abstände und Zeiten MÜSSEN aus zentralen Design-Tokens stammen; Bewegung
  MUSS per Token vollständig abschaltbar sein und ist im Standard aus.
- **FR-007**: Die UI DARF KEINE Transitions, Animationen, Hover-Zustände oder blinkenden Cursor
  enthalten und MUSS `prefers-reduced-motion` respektieren.
- **FR-008**: Touch-Ziele MÜSSEN groß und Fokuszustände deutlich sichtbar sein.
- **FR-009**: Der Projektname MUSS an genau einer Stelle definiert sein und von dort bezogen werden.
- **FR-010**: Es MUSS dokumentierte Befehle für Dev-Server, Produktions-Build, Tests, Linting und
  eine Gesamtprüfung geben; die Gesamtprüfung entspricht der CI.
- **FR-011**: Die CI MUSS bei jedem Push Build, Lint, Typprüfung, Tests, Secret-Scan und
  Lizenz-Check ausführen.
- **FR-012**: Der Lizenz-Check MUSS zweistufig prüfen: Ausgelieferter Code (Laufzeit-Abhängigkeiten)
  MUSS eine Lizenz aus der Freigabeliste haben: MIT, BSD-2-Clause, BSD-3-Clause, ISC, Apache-2.0,
  Zlib, 0BSD, CC0-1.0, Unlicense. Entwicklungswerkzeuge MÜSSEN den Check nur bei GPL, AGPL, LGPL oder
  SSPL (jede Variante) oder fehlender Lizenz scheitern lassen; andere Lizenzen werden aufgelistet.
  Abweichungen sind nur als Einzelausnahme mit ADR zulässig.
- **FR-013**: Die Ignorier-Regeln des Repos MÜSSEN ROM-Dateien ausschließen.
- **FR-014**: Es MUSS einen framework-unabhängigen View-Vertrag geben (Eingaben: Größe,
  Emulator-Zustand read-only und abonnierbar, Projektzustand, Aktionskanal; Ausgaben:
  serialisierbarer Zustand, Titel, Icon).
- **FR-015**: Es MUSS eine Schnittstelle für den Frame-Zustand (Snapshot mit Registern, Flags,
  Zyklen, geänderten Speicherbereichen; konfigurierbare Rate) und eine getypte Union für diskrete
  Ereignisse (mindestens `BreakpointHit`, `BuildFinished`, `RomLoaded`, `ProjectChanged`) geben.
- **FR-016**: Es MUSS Port-Schnittstellen für Emulator, Assembler, Projektspeicher und Archiv geben,
  ohne Implementierung.
- **FR-017**: Es MUSS einen Test-Rahmen für Roundtrip, Boot-Zustand und View-Vertrag geben; noch
  nicht umsetzbare Tests sind als ausstehend markiert.
- **FR-018**: Das Repo MUSS `LICENSE` (MIT), `THIRD_PARTY_LICENSES`, `third_party/`,
  arc42-Kapitel 1–5, 7, 9 und eine ADR-Vorlage enthalten.
- **FR-019**: Die in M0 getroffenen Entscheidungen MÜSSEN als ADR dokumentiert sein (ADR-0001,
  -0002, -0003, -0005, -0007, -0008, -0009 laut Briefing sowie ADR-0010 zu Backend und Hosting).
- **FR-020**: Der Produktions-Build MUSS ausschließlich statische Dateien erzeugen, die ohne
  Server-Logik von jedem statischen Hoster ausgeliefert werden können.
- **FR-021**: Die Oberflächensprache MUSS Englisch sein. Texte stehen direkt im Code; eine
  Übersetzungsinfrastruktur ist nicht vorgesehen.
- **FR-022**: Die App MUSS im jeweils aktuellen Chrome funktionieren (Android, Desktop,
  E-Ink-Geräte mit Android). Die automatischen Oberflächentests (u. a. kein Service Worker, keine
  Animationen) laufen in Chromium. Andere Browser werden nicht gezielt unterstützt.
- **FR-023**: Die Fußzeile MUSS einen Vollbild-Schalter bieten ("Fullscreen" / "Exit fullscreen"), der
  per Fullscreen-API Adresszeile und Systemleisten ausblendet; unterstützt der Browser kein Vollbild,
  wird der Schalter nicht angezeigt. Die installierte App startet im Vollbild (`display: fullscreen`) und
  zeigt den Schalter nicht.

### Key Entities

- **View-Vertrag**: Beschreibt, was ein View erhält und liefert; unabhängig vom UI-Framework.
- **Frame-Snapshot**: Zustand des Emulators zu einem Frame (Register, Flags, Zyklen, geänderte
  Speicherbereiche).
- **Diskretes Ereignis**: Getypter, seltener Vorgang (z. B. Breakpoint erreicht, Build fertig).
- **Layout**: Zuordnung View → Slot, getrennt von allen Projektdaten.
- **Design-Token**: Benannter Wert für Farbe, Abstand oder Zeit.
- **Build-Version**: Commit-Hash des laufenden Builds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Die CI ist auf dem M0-Stand grün; alle Prüfschritte laufen bei jedem Push.
- **SC-002**: Die Shell startet auf einem Mittelklasse-Smartphone in unter 3 Sekunden bis zur
  bedienbaren Oberfläche.
- **SC-003**: Am Gerät lässt sich in 100 % der Fälle ohne Werkzeug ablesen, welcher Commit läuft.
- **SC-004**: Die automatische Prüfung findet 0 registrierte Service Worker und 0 aktive
  Transitions/Animationen in der UI.
- **SC-005**: Im Graustufen-Screenshot sind alle Bedienelemente und Zustände unterscheidbar
  (manuelle Abnahme, dokumentiert mit Screenshot).
- **SC-006**: Ein frischer Klon ist mit höchstens zwei Befehlen (Installieren, Starten) lauffähig.
- **SC-007**: Ein absichtlich eingefügtes Test-Secret und eine GPL-Abhängigkeit werden jeweils von
  der CI erkannt und führen zu einem roten Lauf.
- **SC-008**: Die automatischen Oberflächentests sind in Chromium grün.

## Assumptions

- Stack und Werkzeuge sind durch Briefing und Constitution festgelegt (TypeScript, Vite, Vitest,
  React); konkrete Tools für Lint, Secret-Scan und Lizenz-Check wählt der Plan.
- CI läuft auf GitHub Actions, da das Repo auf GitHub liegt.
- Die arc42-Kapitel 1–5, 7, 9 und das Briefing sind bereits angelegt; M0 ergänzt sie bei Bedarf.
- ADR-0004 (Boot-ROM) und ADR-0006 (Emulator-Core) gehören zu M1 und sind nicht Teil von M0.
- Die App wird vorerst über Replit als statische Seite gehostet; ein Backend gibt es nicht. Das
  Einrichten des Hostings ist nicht Abnahmekriterium von M0; die Abnahme erfolgt lokal bzw. über
  den Dev-Server im WLAN. Der Build MUSS aber rein statische Dateien erzeugen.
- Ein farbiges Theme ist nicht Teil von M0.
- Unterstützung weiterer Browser (Safari, Firefox) und weiterer UI-Sprachen ist nicht Teil der
  ersten Meilensteine (M0–M3).
