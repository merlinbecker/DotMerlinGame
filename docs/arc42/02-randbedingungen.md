# 2. Randbedingungen

## 2.1 Technische Randbedingungen

| Randbedingung | Erläuterung |
|---|---|
| Nur Browser, kein Backend | Alles läuft lokal als PWA. Grundsätzlich keine Server-Komponente, auch nicht später, kein Account. |
| Statische Auslieferung | Der Build besteht nur aus statischen Dateien. Hosting vorerst über Replit, jederzeit gegen einen anderen statischen Hoster austauschbar. |
| Zielplattform | Ausschließlich DMG-01 inklusive Ton. Game Boy Color wird weder unterstützt noch emuliert. |
| Persistenz | IndexedDB für Projekte und Daten. localStorage nur für kleine Einstellungen. |
| Austauschformat | Projekte werden als ZIP exportiert und importiert. |
| Stack | TypeScript, Vite, Vitest, React (ADR-0001) |
| Assembler | RGBDS als WASM (`rgbasm`, `rgblink`, `rgbfix`), sofern lizenz- und build-technisch sauber möglich (offener Punkt) |
| Emulator-Core | Bewusst offen, Auswahl in M1 per ADR-0006. Nur permissive Lizenzen, Tonausgabe erforderlich. |
| Boot-ROM | Eigene DotMerlinGame-Boot-ROM, kompatibel zur Nintendo-Boot-ROM. Keine fremden Boot-ROMs. |
| Zielgeräte | Mittelklasse-Smartphones, Tablets, E-Ink-Geräte, Desktop. Touch zuerst. Referenzgeräte für E-Ink, auf die die Anwendung optimiert wird und die in jedem Gerätetest geprüft werden: Boox Palma und Boox Go Color 7 (beide Android mit Chrome). |
| Browser | In M0–M3 nur aktuelles Chrome (Android, Desktop, E-Ink-Geräte mit Android). Weitere Browser sind nicht Teil der ersten Meilensteine. |
| UI-Sprache | Nur Englisch, Texte direkt im Code, keine Übersetzungsinfrastruktur. |
| Service Worker | Erst ab M7 oder vorher nur hinter Build-Flag. Im Dev- und Test-Betrieb aus. |

## 2.2 Organisatorische Randbedingungen

| Randbedingung | Erläuterung |
|---|---|
| Öffentliches Repo | Historie bleibt. Keine Secrets, keine persönlichen Pfade, nichts Privates. |
| Meilensteine in Reihenfolge | M0 → M1 → M2 → M3, kein Vorgreifen |
| Agentengestützte Entwicklung | Ein Modul pro Auftrag, Tests pro Baustein, Definition of Done mit arc42- und ADR-Pflege |
| Sprache | Doku auf Deutsch, Code, Bezeichner und Commits auf Englisch |

## 2.3 Rechtliche Randbedingungen

| Randbedingung | Erläuterung |
|---|---|
| Projektlizenz | MIT (ADR-0007) |
| Kein GPL-Code | Nichts übernehmen, abschreiben oder nachbauen (z. B. Gambatte scheidet aus) |
| Herkunftsnachweis | Jede Fremdkomponente mit Eintrag in `third_party/` und `THIRD_PARTY_LICENSES`, im selben Commit |
| ROMs | Keine kommerziellen ROMs, Disassemblies oder Nintendo-Boot-ROMs im Repo |
| Marke | Kein "Game Boy" oder "Boy" im Namen, Logo oder Paketnamen. Beschreibend ("für Game-Boy-Homebrew") ist erlaubt. |
| Lizenzprüfung | Immer anhand der LICENSE-Datei der Komponente, nicht aus dem Gedächtnis. Kein Rechtsrat. |

## 2.4 Konventionen

- Architekturdokumentation nach arc42, Entscheidungen als ADR in `docs/adr/`.
- Projektname nur an einer Stelle im Code (Konstante/Config).
- Farben, Abstände und Zeiten nur über Design-Tokens.
- Hardware-Fakten nur aus Pan Docs und RGBDS-Dokumentation.
