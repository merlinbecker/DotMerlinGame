# 1. Einführung und Ziele

## 1.1 Aufgabenstellung

DotMerlinGame ist eine mobile-first Web-IDE für Game-Boy-Homebrew. Zielplattform ist ausschließlich der DMG-01 (Original-Game-Boy, kein Game Boy Color). Nutzerinnen und Nutzer können:

- bestehende ROMs laden und als Quelltext analysieren,
- daran lernen und debuggen,
- eigene Spiele in Assembler schreiben,
- Ergebnisse als `.gb` exportieren, die auf echter Hardware laufen.

Es ist ein Lernprojekt, das am Ende selbst für echte Spiele taugen soll. Alles läuft lokal im Browser, es gibt kein Backend.

### Wesentliche Features (nach Meilenstein)

| Meilenstein | Inhalt |
|---|---|
| M0 Gerüst | Build, Tests, CI, Doku-Skelett, Interfaces für View-Vertrag und Eventmodell, App-Shell mit Schwarz-Weiß-Theme |
| M1 Emulator-Kern | Emulator als Headless Service mit Ton, Screen-Quadrat mit E-Ink-Modus, Controller-Quadrat, ROM laden, eigene Nintendo-kompatible Boot-ROM |
| M2 Assembler, Editor, Export | RGBDS als WASM, Editor-Quadrat, Build-Pipeline, `.gb`-Export, ZIP-Export/-Import |
| M3 Disassembler | ROM-Import als Quelltext, byte-identischer Roundtrip |
| später (nicht beauftragt) | M4 Debugger, M5 Tile-Editor, M6 Tracker, M7 Layout-Feinschliff und PWA-Härtung |

### Nicht-Ziele

- Keine kommerziellen ROMs, Disassemblies davon oder Nintendo-Boot-ROMs im Repo, auch nicht als Testdaten.
- Kein GPL-Code, kein Nachbauen von GPL-Projekten.
- Kein Online-Dienst, kein Account, kein Teilen von ROMs.
- Kein "Game Boy" oder "Boy" im Projektnamen oder Logo.

## 1.2 Qualitätsziele

| Prio | Qualitätsziel | Bedeutung |
|---|---|---|
| 1 | Mobile-Performance | Flüssige Darstellung mit mehreren aktiven Views auf Mittelklasse-Handys |
| 2 | Agententauglichkeit | Klare Module, kleine Aufträge, automatisch prüfbare Abnahmekriterien |
| 3 | Lizenzsauberkeit | Nur kompatible Komponenten, lückenlose Herkunftsdokumentation |
| 4 | Offline und Lokalität | Vollständige Nutzung ohne Netz, keine Daten verlassen das Gerät |
| 5 | Hardware-Treue des Exports | Exportierte `.gb` laufen auf echter Hardware (Header, Prüfsumme, gleicher Startzustand) |
| 6 | E-Ink-Tauglichkeit | UI auf E-Ink-Geräten voll bedienbar: Schwarz-Weiß, hoher Kontrast, keine UI-Animationen, wenig Neuzeichnen |

## 1.3 Stakeholder

| Rolle | Erwartung |
|---|---|
| Projektinhaber (Merlin) | Lernprojekt, das echte Homebrew-Spiele ermöglicht; nachvollziehbare, öffentliche Historie |
| Homebrew-Entwickler:innen | Spiele mobil schreiben, testen, debuggen und exportieren |
| Lernende | ROMs analysieren, Assembler und Hardware verstehen |
| Coding-Agenten | Klare Module, kleine Aufträge, eindeutige Regeln (`CLAUDE.md`) und prüfbare Abnahmekriterien |
