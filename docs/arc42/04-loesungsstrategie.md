# 4. Lösungsstrategie

| Leitprinzip | Umsetzung | Qualitätsziel | ADR |
|---|---|---|---|
| Quelltext ist die einzige Wahrheit | Fremde ROMs werden beim Import einmalig disassembliert. Jeder Lauf ist Assemblieren → Emulieren. Das ROM ist nur Build-Ergebnis. | Hardware-Treue, Agententauglichkeit | ADR-0005 |
| Emulator als Headless Service | CPU, Speicher, Breakpoints, Step als Dienst. Views abonnieren nur Zustand und Events. Der Screen ist auch nur ein View. | Mobile-Performance | ADR-0006, ADR-0008 |
| Ports und Adapter | Emulator-Core, Assembler, Projektspeicher und ZIP hinter eigenen Interfaces in `src/core/`. Fremdcode nur in `src/adapters/` und `third_party/`. | Lizenzsauberkeit, Agententauglichkeit | ADR-0003 |
| Debug-Info aus jedem Build | Assembler liefert Symbol- und Map-Dateien, der Debugger arbeitet auf Quelltextzeilen. | Agententauglichkeit, Lernziel | – |
| Layout getrennt vom Zustand | Raster speichert nur, welcher View in welchem Slot liegt. Projekt-, ROM- und Symboldaten separat. | Mobile-Performance | – |
| Zwei Eventkanäle | Frame-Zustand als drosselbarer Snapshot, diskrete Ereignisse als getypte Union. Kein String-Bus. | Mobile-Performance, E-Ink-Tauglichkeit | ADR-0008 |
| Mobile-Realität zuerst | Touch, kleine Screens, Mittelklasse-Handys, offline | Mobile-Performance, Offline | – |
| E-Ink first | Schwarz-Weiß-Theme als Standard, keine UI-Animationen, Blättern statt Scrollen, Design-Tokens | E-Ink-Tauglichkeit | ADR-0009 |
| Lokal und offline | IndexedDB, ZIP, Service Worker erst spät | Offline und Lokalität | ADR-0002, ADR-0008 |
| Kein Backend, statisch ausgeliefert | Build erzeugt nur statische Dateien, Hosting austauschbar (vorerst Replit) | Offline und Lokalität | ADR-0010 |

## UX-Grundkonzept

- Jeder View ist ein Quadrat. Hochformat: zwei Quadrate untereinander, Querformat: nebeneinander, große Screens: Raster bis 4x4.
- Ein Quadrat wird nur über die Pfeiltasten in seiner Kopfleiste gewechselt (kein Wischen), damit nichts mit Eingaben im Inhalt kollidiert.
- Vollbild/Zoom pro Slot über einen Zoom-Schalter in der Kopfleiste (keine Zoom-Geste).
- Sparsam mit Gesten: sichtbare Schalter statt Gesten, weil Gesten fehleranfällig sind.
- Unsichtbare Views aktualisieren sich nicht.

## Hardware-Treue

- Export erzeugt `.gb` per `rgbfix`: Header-Logo `$0104–$0133` unverändert, Header-Checksumme `$014D` korrekt.
- Die eigene DotMerlinGame-Boot-ROM existiert nur im Emulator, ist kompatibel zur Nintendo-Boot-ROM und hinterlässt den Zustand nach Pan Docs ("Power Up Sequence"). Fremde Boot-ROMs werden nicht eingebunden.
- Spiele dürfen sich nie auf den Inhalt der Boot-ROM verlassen. Test-ROMs laufen mit eigener Boot-ROM und ohne Boot-ROM identisch.
- Zielplattform ist ausschließlich der DMG-01 inklusive Ton.
