<!--
Sync Impact Report
- Version: 1.0.0 → 1.1.0 (MINOR: Prinzipien wesentlich erweitert)
- Geändert: VII. Hardware-Treue des Exports (eigene, Nintendo-kompatible Boot-ROM; keine fremden
  Boot-ROMs; nur DMG-01 inkl. Ton); IX. Lokal und offline (grundsätzlich kein Backend, statische
  Auslieferung, Hosting austauschbar, vorerst Replit)
- Geändert: Technische und rechtliche Randbedingungen (Zielplattform, Auslieferung)
- Hinzugefügte/entfernte Abschnitte: keine
- Offene TODOs: keine
-->

# DotMerlinGame Constitution

Mobile-first Web-IDE für Game-Boy-Homebrew, vollständig lokal im Browser. Diese Constitution
fasst die nicht verhandelbaren Regeln aus `docs/BOOTSTRAP-BRIEFING.md` und `CLAUDE.md` zusammen.
Jede Spec, jeder Plan und jede Aufgabe MUSS dagegen geprüft werden.

## Core Principles

### I. Quelltext als einzige Wahrheit

- Fremde ROMs werden beim Import genau einmal disassembliert. Danach wird nur am Quelltext gearbeitet.
- Jeder Lauf ist: Assemblieren → Emulieren. Ein ROM ist ausschließlich Build-Ergebnis und wird
  nie als bearbeitbares Artefakt gespeichert oder verändert.
- Jeder Build MUSS Symbol- und Map-Dateien liefern, damit Debugging auf Quelltextzeilen möglich ist.

Begründung: Nur so bleiben Lernen, Debuggen und Export konsistent und reproduzierbar.

### II. Emulator als Headless Service

- Der Emulator (CPU, Speicher, Breakpoints, Step) ist ein Dienst ohne eigene UI.
- Views lesen nur Zustand und abonnieren Ereignisse. Sie greifen NIE direkt in den Emulator ein;
  Änderungen laufen ausschließlich über den Aktionskanal des View-Vertrags.
- Auch der Screen ist nur ein View.

Begründung: Entkopplung macht Views austauschbar, testbar und drosselbar.

### III. Ports und Adapter

- Emulator-Core, Assembler, Projektspeicher und ZIP stehen hinter eigenen Interfaces in `src/core/`.
- `src/core/` ist frei von Fremdcode und UI-Framework.
- Fremdcode lebt nur in `src/adapters/` bzw. `third_party/`.

Begründung: "Übernehmen oder nachbauen" bleibt eine lokale, reversible Entscheidung.

### IV. Getypte Eventkanäle, Layout getrennt vom Zustand

- Genau zwei Kanäle: Frame-Zustand als Snapshot (Views ziehen nur, wenn sichtbar; Rate
  konfigurierbar) und diskrete Ereignisse als getypte Union. Ein String-Bus (`emit('…')`) ist verboten.
- Das Raster speichert nur, welcher View in welchem Slot liegt. Projekt-, ROM- und Symboldaten
  liegen separat.
- Der Projektname steht nur an einer Stelle (Konstante/Config).

Begründung: Typisierung macht Ereignisse testbar; die drosselbare Rate trägt den E-Ink-Modus.

### V. E-Ink-first UI

- Standard-Theme: schwarz auf weiß, hoher Kontrast, nur Graustufen. Farbe ist nie alleiniger
  Bedeutungsträger.
- Keine UI-Animationen, Transitions, Skeleton-Loader oder blinkenden Cursor.
  `prefers-reduced-motion` wird respektiert. Ausnahme: Spielinhalt im Screen-View.
- Blättern statt Dauer-Scrolling in langen Listen, Hex- und Code-Ansichten.
- Farben, Abstände und Zeiten nur über Design-Tokens, nie als Einzelwerte in Komponenten.
- Große Touch-Ziele, keine Hover-Zustände, Wechsel des View-Inhalts nur über die Kopfleiste.

Begründung: Die UI wird ausdrücklich auf E-Ink-Geräten bedient.

### VI. Lizenzsauberkeit

- Projektlizenz ist MIT. Kein GPL-Code: nichts übernehmen, abschreiben oder nachbauen.
  Im Zweifel stoppen und fragen.
- Jede Fremdkomponente MUSS im selben Commit in `third_party/` (Quelle, Version, Lizenz,
  Commit-Hash) und `THIRD_PARTY_LICENSES` eingetragen werden. Übernahmen aus Vorlage-Repos nur per ADR.
- Nie im Repo: kommerzielle ROMs und deren Disassemblies, Nintendo-Boot-ROMs, Secrets,
  persönliche Pfade. Tests nutzen nur selbst gebaute oder frei lizenzierte ROMs.
- Kein "Game Boy" oder "Boy" im Projektnamen, Logo oder Paketnamen.

Begründung: Das Repo ist öffentlich, die Historie bleibt.

### VII. Hardware-Treue des Exports

- Exportierte `.gb` MÜSSEN auf echter Hardware starten: Header-Logo `$0104–$0133` unverändert,
  Header-Checksumme `$014D` korrekt, Erzeugung per `rgbfix` in der Build-Pipeline.
- Die eigene DotMerlinGame-Boot-ROM existiert nur im Emulator, ist kompatibel zur
  Nintendo-Boot-ROM und hinterlässt exakt den Zustand nach Pan Docs ("Power Up Sequence"),
  abgesichert durch Tests. Fremde Boot-ROMs werden nicht eingebunden.
- Jedes Test-ROM MUSS mit eigener Boot-ROM und ohne Boot-ROM identisch laufen.
- Zielplattform ist ausschließlich der DMG-01, inklusive Ton. Game Boy Color wird weder
  unterstützt noch emuliert.

Begründung: Was in der IDE läuft, muss auch auf dem Gerät laufen.

### VIII. Tests pro Baustein (NICHT VERHANDELBAR)

- Jeder Baustein hat Tests. Ohne grüne Tests (`npm test`) und grüne CI ist nichts fertig.
- Fehlschlagende Tests werden nie abgeschwächt oder auskommentiert, um grün zu werden.
- Abnahmekriterien MÜSSEN automatisch prüfbar sein, wo immer möglich.

Begründung: Agentengestützte Entwicklung braucht objektive Fertig-Kriterien.

### IX. Lokal und offline

- Kein Backend, auch nicht später: Die App ist rein clientseitig und wird ausschließlich als
  statische Dateien ausgeliefert. Kein Account, kein Online-Dienst, keine Laufzeit-Netzwerkzugriffe.
  Keine Daten verlassen das Gerät außer durch bewussten Export.
- Das Hosting ist austauschbar (vorerst Replit); nichts im Code DARF von einem bestimmten Hoster
  abhängen.
- Persistenz in IndexedDB; localStorage nur für kleine Einstellungen. Austausch per ZIP.
- Service Worker erst ab M7 oder vorher nur hinter Build-Flag; im Dev- und Test-Betrieb aus.
  Die Build-Version (Commit-Hash) ist immer sichtbar.

Begründung: Offline-Fähigkeit und Datenschutz sind Qualitätsziele, Cache-Probleme stören Gerätetests.

### X. Belegte Fakten statt Annahmen

- Keine Annahmen zu Lizenzen, Hardware-Verhalten oder Registerwerten aus dem Gedächtnis.
- Maßgeblich sind Pan Docs, die RGBDS-Dokumentation und die LICENSE-Dateien der Komponenten.
- Unsicheres wird als offener Punkt notiert, nicht geraten.

Begründung: Falsche Hardware- oder Lizenzannahmen sind teuer und schwer zu entdecken.

## Technische und rechtliche Randbedingungen

- Zielplattform: DMG-01 (kein Game Boy Color).
- Auslieferung: statische Dateien, vorerst über Replit gehostet.
- Stack: TypeScript, Vite, Vitest, React. RGBDS als WASM. Emulator-Core wird in M1 per ADR gewählt
  (nur permissive Lizenzen).
- Dokumentation (arc42, ADRs, Specs) auf Deutsch; Code, Bezeichner, Commits und Kommentare auf Englisch.
- Verzeichnisstruktur gemäß Briefing Abschnitt 6 (`src/core`, `src/adapters`, `src/views`,
  `src/app`, `tests`, `examples`, `docs`, `third_party`).
- Lizenzangaben sind kein Rechtsrat und werden beim Einbinden anhand der LICENSE-Datei geprüft.

## Entwicklungsablauf und Qualitätstore

- Meilensteine strikt in Reihenfolge (M0 → M1 → M2 → M3). Keine Features späterer Meilensteine vorziehen.
- Ein Modul pro Auftrag; Änderungen außerhalb nur nach Rückfrage.
- Plan zuerst bei größerem Code; echte Entscheidungen werden erfragt.
- Definition of Done je Aufgabe: Tests geschrieben und grün; betroffene arc42-Kapitel in
  `docs/arc42/` aktualisiert; Entscheidungen als ADR in `docs/adr/`; `third_party/` und
  `THIRD_PARTY_LICENSES` aktuell; Abnahmekriterien des Meilensteins geprüft.
- Kleine, nachvollziehbare Commits mit sprechenden Messages. CI prüft Build, Lint, Typen, Tests,
  Secret-Scan und Lizenzen.

## Governance

- Rangfolge bei Widersprüchen: Bootstrap-Briefing > ADRs > diese Constitution > `CLAUDE.md` >
  eigene Annahmen.
- Änderungen an der Constitution erfolgen per eigenem Commit mit Begründung; widersprechen sie dem
  Briefing, ist zuerst das Briefing (mit Freigabe des Projektinhabers) anzupassen.
- Versionierung nach SemVer: MAJOR bei Entfernen oder Umdeuten von Prinzipien, MINOR bei neuen
  Prinzipien oder wesentlicher Erweiterung, PATCH bei Klarstellungen.
- Jede Spec, jeder Plan (`/speckit-plan`, Constitution Check) und jedes Review prüft die
  Einhaltung. Abweichungen MÜSSEN im Plan begründet und dokumentiert werden.

**Version**: 1.1.0 | **Ratified**: 2026-10-18 | **Last Amended**: 2026-10-18
