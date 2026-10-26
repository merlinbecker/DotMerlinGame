# DotMerlinGame – Bootstrap-Briefing

Status: Freigegeben (Änderungen vom 2026-10-18 siehe Abschnitt 12) · Zielort im Repo: `docs/BOOTSTRAP-BRIEFING.md`
Repo: https://github.com/merlinbecker/DotMerlinGame · Sprache der Doku: Deutsch (arc42) · Code und Bezeichner: Englisch

---

## 1. Vision

DotMerlinGame ist eine mobile-first Web-IDE für Game-Boy-Homebrew. Man kann bestehende ROMs laden und als Quelltext analysieren, daran lernen, debuggen, eigene Spiele in Assembler schreiben und als `.gb` exportieren. Es ist ein Lernprojekt und soll am Ende selbst für echte Spiele taugen.

## 2. Scope und Nicht-Ziele

**Im Scope**
- Alles läuft lokal im Browser (PWA, offline-fähig). Kein Backend, nichts auf einem Server.
- Persistenz in IndexedDB (nicht localStorage, außer für kleine Einstellungen). Export und Import von Projekten als ZIP.
- Quadratische, frei belegbare Views (Screen, Controller, Speicher, Code, Debugger, später Tile-Editor und Tracker).

**Nicht-Ziele**
- Keine kommerziellen ROMs, Disassemblies davon oder Nintendo-Boot-ROMs im Repo (auch nicht als Testdaten).
- Kein GPL-Code, kein Nachbauen von GPL-Projekten.
- Kein Online-Dienst, kein Account, kein Teilen von ROMs.
- Kein "Game Boy" oder "Boy" im Projektnamen oder Logo.

## 3. Leitprinzipien der Architektur

1. **Der Quelltext ist die einzige Wahrheit.** Fremde ROMs werden einmalig beim Import disassembliert. Danach arbeitet man nur noch am Quelltext. Jeder Lauf ist: Assemblieren → Emulieren. Das ROM ist ein reines Build-Ergebnis.
2. **Der Emulator ist ein Headless Service.** CPU, Speicher, Breakpoints, Step. Alle Views abonnieren nur seinen Zustand und seine Events. Der Screen ist ebenfalls nur ein View.
3. **Ports und Adapter um Fremdkomponenten.** Emulator-Core, Assembler (RGBDS-WASM), Projektspeicher und ZIP stehen hinter eigenen Schnittstellen. "Übernehmen oder nachbauen" ist damit eine lokale Entscheidung.
4. **Debug-Info aus jedem Build.** Der Assembler liefert Symbol- und Map-Dateien. Der Debugger arbeitet damit immer auf Quelltextzeilen.
5. **Layout getrennt vom Zustand.** Das Raster speichert nur, welcher View in welchem Slot liegt. Projekt-, ROM- und Symboldaten liegen separat.
6. **Mobile-Realität zuerst.** Touch statt Maus, kleine Screens, Performance auf Mittelklasse-Handys, Offline.
7. **E-Ink first für die UI.** Schwarz-Weiß, keine UI-Animationen, Farbe nie als alleiniger Bedeutungsträger. Details in Abschnitt 4.

## 4. UX-Konzept: Quadratische Views

- Jeder View ist ein Quadrat. Hochformat: 2 Quadrate untereinander. Querformat: nebeneinander. Große Screens: Raster bis 4x4.
- Jedes Quadrat lässt sich durch einen anderen View oder Editor ersetzen. Wechsel nur über eine **Kopfleiste am Quadrat** (Pfeiltasten dort, keine Wischgeste), damit nichts mit Eingaben im Inhalt (Scrollen im Hex-View, Zeichnen im Tile-Editor, Spieleingaben im Controller) kollidiert.
- **Vollbild/Zoom pro Slot** über einen Zoom-Schalter in der Kopfleiste, keine Zoom-Geste. Wichtig z. B. für textlastige Views wie Editor und Disassembly.
- **Sparsam mit Gesten:** Bedienung über sichtbare Schalter statt Gesten, weil Gesten fehleranfällig sind und mit Inhaltseingaben kollidieren.
- Nicht sichtbare Views aktualisieren sich nicht. Der Emulator veröffentlicht Zustand gebündelt pro Frame.

### E-Ink-Tauglichkeit der Oberfläche

Die UI wird ausdrücklich auch auf E-Ink-Smartphones und -Tablets bedient. Daraus folgen feste Regeln für die gesamte Oberfläche (nicht für den Spielinhalt im Screen-View):

- **Schwarz-Weiß-first:** Das Standard-Theme ist schwarz auf weiß, hoher Kontrast, nur Graustufen. Bedeutung wird nie allein über Farbe transportiert, sondern über Form, Stärke, Unterstreichung, Invertierung oder Muster.
- **Keine großen Animationen:** Keine Übergänge, Slide- oder Fade-Effekte, keine Skeleton-Loader, kein blinkender Cursor. Wechsel von Views und Dialogen erfolgen sofort. `prefers-reduced-motion` wird immer respektiert, im E-Ink-Modus ist Bewegung grundsätzlich aus.
- **Wenig Neuzeichnen:** Aktualisierungen betreffen nur geänderte Bereiche. Statt Dauer-Scrolling bevorzugt die UI seitenweises Blättern (Hex-View, Disassembly, Listen), weil Scrollen auf E-Ink Ghosting und Verzögerung erzeugt.
- **Syntax-Hervorhebung ohne Farbe:** Fett, kursiv, unterstrichen, Rahmen. Geänderte Werte im Debugger (Register, Speicher) werden invertiert oder umrahmt dargestellt, nicht farbig geblitzt.
- **Große, klare Touch-Ziele,** keine Hover-Zustände, deutliche Fokusrahmen, dicke Rahmen um Quadrate und Kopfleisten.
- **Tile-Editor und Paletten:** Die vier Graustufen des DMG sind der Normalfall. Darstellung zusätzlich über Muster/Schraffur wählbar, damit Stufen auf E-Ink unterscheidbar bleiben.
- **Screen-View als Sonderfall:** Der Spielinhalt darf Animationen und die volle Bildwiederholrate zeigen. Zusätzlich gibt es einen E-Ink-Modus des Screen-Views (reduzierte Bildrate, Graustufen-Mapping, optional Dithering), damit der Emulator auch dort benutzbar bleibt.
- **Theme-Schalter:** E-Ink/Schwarz-Weiß ist Standard, ein farbiges Theme ist später optional. Alle Farben und Zeiten kommen aus Design-Tokens, nicht aus Einzelwerten in Komponenten.

Die Aktualisierungsrate der Views ist über den Eventkanal "Frame-Zustand" drosselbar (siehe Eventmodell), damit der E-Ink-Modus keine Sonderlogik in jedem View braucht.

### View-Vertrag (erster Baustein, in M0 als Interface definiert)

Jeder View erhält: aktuelle Größe, Zugriff auf Emulator-Zustand (read-only, abonnierbar), Zugriff auf Projektzustand, einen Kanal für Aktionen (z. B. "Breakpoint setzen"). Jeder View liefert: eigenen, serialisierbaren Zustand (für das Layout), Titel und Icon für die Kopfleiste. Der Vertrag ist unabhängig vom UI-Framework definiert (TypeScript-Interfaces), die Umsetzung ist React.

### Eventmodell (zwei Kanäle, kein globaler String-Bus)

1. **Frame-Zustand (hochfrequent):** Der Emulator veröffentlicht pro Frame einen Snapshot (Register, Flags, Zyklen, geänderte Speicherbereiche). Views ziehen nur, was sie brauchen, und nur wenn sie sichtbar sind. In React per `useSyncExternalStore`.
2. **Diskrete Ereignisse (selten):** Getypte Union, z. B. `BreakpointHit`, `BuildFinished`, `RomLoaded`, `ProjectChanged`. Das ist der eigentliche Eventbus: klein, typisiert, testbar. Kein `emit('irgendwas')` mit freien Strings.

Das Interface beider Kanäle wird in M0 festgelegt, die Umsetzung erfolgt in M1. Die Frequenz der Veröffentlichung ist konfigurierbar (z. B. volle Rate, reduzierte Rate, nur auf Anforderung), das ist die Grundlage für den E-Ink-Modus.

## 5. Technischer Stack

- TypeScript, Vite, Vitest, React
- RGBDS als WASM (Emscripten), inklusive `rgbasm`, `rgblink`, `rgbfix`, falls lizenz- und build-technisch sauber möglich
- Emulator-Core: **bewusst offen**, wird in M1 per ADR nach Vergleich der Debug-Hooks entschieden (Kandidaten mit permissiver Lizenz, z. B. binjgb oder SameBoy; Gambatte ist GPL und scheidet aus)
- Speicher: IndexedDB. ZIP-Handling mit einer MIT-lizenzierten Bibliothek
- CI: Build, Lint, Tests, Secret-Scan, Lizenz-Check

### PWA und Offline-Fähigkeit

Nicht das Manifest cached, sondern der Service Worker. Damit Gerätetests in der Entwicklung nicht von altem Cache gestört werden:

- **Service Worker erst spät:** In M0 nur Manifest und Icons. Der Service Worker kommt erst in M7 (PWA-Härtung) oder vorher nur hinter einem Build-Flag. Im Dev-Betrieb und in Test-Builds ist er aus.
- **Wenn aktiv:** Versionierte Caches, Hinweis "Update verfügbar" statt stillem Weiterlaufen mit altem Stand, Button "Cache leeren / Neu laden" in den Einstellungen.
- **Build-Version sichtbar:** Commit-Hash in der Fußzeile, damit am Gerät sofort erkennbar ist, welcher Stand läuft.
- **Hinweis:** Service Worker brauchen HTTPS oder localhost. Ein Dev-Server im WLAN über HTTP umgeht ihn ohnehin.

## 6. Repo-Layout

```
/
├─ CLAUDE.md                 Agenten-Regeln, verweist auf arc42 und ADRs
├─ LICENSE                   MIT
├─ THIRD_PARTY_LICENSES      eine Komponente je Eintrag mit Lizenztext
├─ third_party/              Quelle, Version, Lizenz, Commit-Hash je Komponente
├─ docs/
│  ├─ BOOTSTRAP-BRIEFING.md  dieses Dokument
│  ├─ arc42/                 01-einfuehrung.md … 12-glossar.md (zunächst 1–5, 7, 9)
│  └─ adr/                   0001-….md (ADR-Vorlage im Ordner)
├─ src/
│  ├─ core/                  Ports (Interfaces), Projektmodell, Events
│  ├─ adapters/              Emulator, RGBDS-WASM, Storage, ZIP
│  ├─ views/                 ein Ordner pro View
│  └─ app/                   Raster, Navigation, PWA-Shell
├─ tests/                    Roundtrip, Boot-Zustand, View-Vertrag
└─ examples/                 selbst geschriebene Beispielprojekte (lizenzfrei)
```

Der Projektname steht nur an **einer** Stelle (Konstante/Config).

## 7. Arbeitsregeln für den Agenten

1. Ein Modul pro Auftrag. Keine Änderungen außerhalb des eigenen Moduls ohne Rückfrage.
2. Tests pro Baustein. Ohne grüne Tests ist nichts fertig.
3. Übernahmen aus Fremd-Repos nur bewusst und per ADR. Eintrag in `third_party/` und `THIRD_PARTY_LICENSES` im selben Schritt.
4. Kein Code aus GPL-Projekten übernehmen, abschreiben oder "nachbauen". Bei Zweifel: stoppen und fragen.
5. Keine ROMs, Boot-ROMs von Nintendo, Secrets oder persönliche Pfade committen. `.gitignore` schließt ROMs aus.
6. arc42-Update der betroffenen Kapitel ist Teil der Definition of Done. Entscheidungen gehören als ADR dokumentiert.
7. Kleine, nachvollziehbare Commits. Das Repo wird so geführt, als wäre es öffentlich.

## 8. Meilensteine

### M0 – Gerüst
Repo-Setup: Build, Test, CI, arc42-Skelett (Kapitel 1–5, 7, 9 mit Platzhaltern), ADR-Vorlage, `third_party/`, `CLAUDE.md`, MIT-Lizenz, Secret-Scan, leerer Test-Rahmen für Roundtrip und Boot-Zustand. Interfaces für View-Vertrag und Eventmodell (Frame-Zustand und getypte Ereignisse). PWA nur mit Manifest, ohne Service Worker. Design-Tokens und Schwarz-Weiß-Theme als Standard, Bewegung per Token abschaltbar.
**Abnahme:** CI ist grün, `docs/` und `third_party/` sind angelegt, App-Shell startet im Browser, die Build-Version (Commit-Hash) ist in der Oberfläche sichtbar, es ist kein Service Worker registriert, die Shell ist ohne Farbe vollständig bedienbar (Graustufen-Screenshot-Check), und es laufen keine CSS-Transitions oder -Animationen in der UI.

### M1 – Emulator-Kern und eigene Boot-ROM
Emulator-Core im Browser als Headless Service. Screen-Quadrat und Controller-Quadrat. ROM aus dem lokalen Speicher laden. Eigene Boot-ROM mit eigenem Logo (Emulator-only). ADR zur Core-Auswahl.
**Abnahme:**
- Der Zustand nach dem Boot (Register, I/O-Register) stimmt mit den Pan-Docs-Werten ("Power Up Sequence") überein.
- Ein freies Test-ROM läuft mit eigener Boot-ROM und ohne Boot-ROM (Direktstart) identisch.
- Optionaler Modus "Hardware-nah": prüft Header-Logo und Checksumme wie die Original-Boot-ROM.

### M1b – Speicher-Ansichten (nur lesen)
Lese-Ansichten auf den laufenden Emulator, jeweils als eigener View: Hex-View (ROM bankweise, WRAM, HRAM, I/O-Register), VRAM-Tiles, Tilemaps (Hintergrund und Fenster), OAM/Sprites und CPU-Register mit Flags. Nur Anzeige: kein Schreiben in den Speicher, keine Breakpoints, kein Step (bleibt M4).
**Abnahme:** Mit selbst gebauten Test-ROMs zeigen alle Ansichten nachweislich die Werte aus dem Emulator (automatische Tests), sie greifen nur über den View-Vertrag zu, ausgeblendete Ansichten erhalten keine Updates, und alle Ansichten sind auf E-Ink bedienbar (Blättern statt Scrollen, Hervorhebung ohne Farbe).

### M2 – Assembler, Editor, Export
RGBDS-WASM, Editor-Quadrat, Build-Pipeline (`rgbasm` → `rgblink` → `rgbfix`), `.gb`-Export, Symbol-/Map-Datei, ZIP-Export und -Import von Projekten, Beispielprojekt.
**Abnahme:** Das selbst geschriebene Beispielprojekt baut, läuft im Emulator, hat einen gültigen Header (Logo, Prüfsumme) und lässt sich als ZIP exportieren und wieder importieren.

### M3 – Disassembler und Roundtrip
ROM-Import → Quelltext. Konservative Analyse: Einstiegspunkte (Reset-Vektoren, Interrupts, `$0100`), Sprüngen folgen, Unsicheres bleibt `db`/`dw`.
**Abnahme:** Roundtrip ROM → Quelltext → Assemblieren ergibt byte-identisch das Original. Geprüft mit freien Homebrew-ROMs und mit selbst gebauten ROMs. Kommerzielle ROMs nur lokal.

### Danach (grob, noch nicht beauftragt)
M4 Debugger (Breakpoints, Step, Schreiben in Speicher und Register, Quelltextzeilen; erweitert die Ansichten aus M1b) · M5 Tile-Editor · M6 Tracker (hUGEDriver-Format) · M7 Layout-Feinschliff, PWA/Offline-Härtung (Service Worker).

## 9. Erste ADRs (im Rahmen von M0/M1)

- ADR-0001: Web-Stack (TypeScript, Vite, Vitest, React)
- ADR-0002: Persistenz in IndexedDB, ZIP für Export/Import
- ADR-0003: Fremdkomponenten-Strategie (Vorlage statt Fundament, Ports/Adapter, `third_party/`)
- ADR-0004: Boot-ROM-Strategie (eigene Boot-ROM nur im Emulator, Header bleibt original, Modi)
- ADR-0005: Quelltext als einzige Wahrheit
- ADR-0006: Emulator-Core-Auswahl (in M1)
- ADR-0007: Lizenz (MIT) und Umgang mit Marke/Namen
- ADR-0008: Eventmodell (Frame-Zustand per Snapshot und getypte Ereignisse) sowie Strategie für Service Worker und Offline
- ADR-0009: UI-Prinzipien für E-Ink (Schwarz-Weiß-first, keine Animationen, Blättern statt Scrollen, Design-Tokens, E-Ink-Modus des Screen-Views)

## 10. Qualitätsziele (Kapitel 10/1 in arc42)

1. **Mobile-Performance:** flüssige Darstellung mit mehreren aktiven Views auf Mittelklasse-Handys.
2. **Agententauglichkeit:** klare Module, kleine Aufträge, automatisch prüfbare Abnahmekriterien.
3. **Lizenzsauberkeit:** nur kompatible Komponenten, lückenlose Herkunftsdokumentation.
4. **Offline und Lokalität:** vollständige Nutzung ohne Netz, keine Daten verlassen das Gerät.
5. **Hardware-Treue des Exports:** exportierte `.gb` laufen auf echter Hardware (Header, Prüfsumme, gleicher Startzustand).
6. **E-Ink-Tauglichkeit:** Die UI ist auf E-Ink-Smartphones und -Tablets voll bedienbar: Schwarz-Weiß, hoher Kontrast, keine UI-Animationen, wenig Neuzeichnen.

## 11. Offene Punkte (während M0/M1 zu klären)

- Prüfen: Lässt sich RGBDS inklusive `rgbfix` sauber als WASM bauen, oder gibt es ein gepflegtes WASM-Paket mit passender Lizenz?
- Prüfen: Lizenz und Pflegezustand von hUGEDriver und hardware.inc zum Zeitpunkt der Einbindung.
- Entscheiden: Wie viel Debug-Zugriff braucht die Emulator-Port-Schnittstelle (Speicher-Watch, Schreib-Breakpoints, Bank-Info)?
- Hinweis: Lizenzangaben in diesem Dokument sind Stand meines Wissens und müssen beim Einbinden anhand der jeweiligen LICENSE-Datei geprüft werden. Kein Rechtsrat.

## 12. Änderungen

**2026-10-18 (Entscheidungen des Projektinhabers)**
- Zielplattform ist ausschließlich der DMG-01. Game Boy Color wird weder unterstützt noch emuliert.
- Tonausgabe (vier Tonkanäle des DMG-01) ist Teil von M1.
- Der E-Ink-Modus des Screen-Views ist Teil von M1.
- Die eigene DotMerlinGame-Boot-ROM ist kompatibel zur Nintendo-Boot-ROM (gleicher Endzustand laut Pan Docs). Fremde Boot-ROMs (z. B. SameBoy) werden nicht eingebunden; Startmodi sind eigene Boot-ROM und Direktstart.
- Es gibt grundsätzlich kein Backend. Die App ist rein clientseitig und wird statisch ausgeliefert. Hosting vorerst über Replit, ein anderer statischer Hoster ist jederzeit möglich.
- Keine Gesten für Rahmenfunktionen: View-Wechsel nur über Pfeiltasten in der Kopfleiste (kein Wischen), Zoom nur über einen Zoom-Schalter in der Kopfleiste (kein Doppeltipp). Begründung: Gesten sind fehleranfällig.

**2026-10-26 (Entscheidung des Projektinhabers)**
- Neuer Meilenstein M1b „Speicher-Ansichten (nur lesen)“ zwischen M1 und M2. Hex-View, VRAM-Tiles, Tilemaps, OAM/Sprites und Register werden aus M4 vorgezogen, damit bestehende ROMs schon vor dem Debugger genauer angeschaut werden können. Breakpoints, Step und Schreibzugriffe bleiben in M4. Die Nummern der übrigen Meilensteine bleiben unverändert.
