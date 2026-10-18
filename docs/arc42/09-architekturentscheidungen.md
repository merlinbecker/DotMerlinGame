# 9. Architekturentscheidungen

Entscheidungen werden als ADR in `docs/adr/` dokumentiert. Die ADR-Vorlage entsteht in M0.

| ADR | Thema | Meilenstein | Status |
|---|---|---|---|
| ADR-0001 | Web-Stack (TypeScript, Vite, Vitest, React) | M0 | geplant |
| ADR-0002 | Persistenz in IndexedDB, ZIP für Export/Import | M0 | geplant |
| ADR-0003 | Fremdkomponenten-Strategie (Vorlage statt Fundament, Ports/Adapter, `third_party/`) | M0 | geplant |
| ADR-0004 | Boot-ROM-Strategie (eigene Boot-ROM nur im Emulator, Header bleibt original, Modi) | M0/M1 | geplant |
| ADR-0005 | Quelltext als einzige Wahrheit | M0 | geplant |
| ADR-0006 | Emulator-Core-Auswahl | M1 | offen |
| ADR-0007 | Lizenz (MIT) und Umgang mit Marke/Namen | M0 | geplant |
| ADR-0008 | Eventmodell sowie Strategie für Service Worker und Offline | M0 | geplant |
| ADR-0009 | UI-Prinzipien für E-Ink | M0 | geplant |
| ADR-0010 | Kein Backend, statische Auslieferung, Hosting vorerst über Replit | M0 | geplant |

## Offene Punkte

- Lässt sich RGBDS inklusive `rgbfix` sauber als WASM bauen, oder gibt es ein gepflegtes WASM-Paket mit passender Lizenz?
- Lizenz und Pflegezustand von hUGEDriver und hardware.inc zum Zeitpunkt der Einbindung.
- Umfang des Debug-Zugriffs am Emulator-Port (Speicher-Watch, Schreib-Breakpoints, Bank-Info).
- Lizenzangaben im Briefing sind nicht verifiziert und müssen anhand der LICENSE-Dateien geprüft werden.
