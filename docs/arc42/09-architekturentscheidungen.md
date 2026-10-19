# 9. Architekturentscheidungen

Entscheidungen werden als ADR in `docs/adr/` dokumentiert. Vorlage: [`docs/adr/0000-template.md`](../adr/0000-template.md).

| ADR | Thema | Meilenstein | Status |
|---|---|---|---|
| ADR-0001 | [Web-Stack](../adr/0001-web-stack.md) | M0 | akzeptiert |
| ADR-0002 | [Persistenz in IndexedDB, ZIP für Export/Import](../adr/0002-persistenz-indexeddb-zip.md) | M0 | akzeptiert |
| ADR-0003 | [Fremdkomponenten-Strategie und zweistufiger Lizenz-Check](../adr/0003-fremdkomponenten-strategie.md) | M0 | akzeptiert |
| ADR-0004 | [Boot-ROM-Strategie (eigene, Nintendo-kompatible Boot-ROM nur im Emulator)](../adr/0004-boot-rom-strategie.md) | M1 | akzeptiert |
| ADR-0005 | [Quelltext als einzige Wahrheit](../adr/0005-quelltext-einzige-wahrheit.md) | M0 | akzeptiert, Nachtrag M1 |
| ADR-0006 | [Emulator-Core-Auswahl (SameBoy)](../adr/0006-emulator-core.md) | M1 | akzeptiert |
| ADR-0007 | [Lizenz (MIT) und Umgang mit Marke/Namen](../adr/0007-lizenz-und-marke.md) | M0 | akzeptiert |
| ADR-0008 | [Eventmodell sowie Service Worker und Offline](../adr/0008-eventmodell-und-offline.md) | M0 | akzeptiert |
| ADR-0009 | [UI-Prinzipien für E-Ink](../adr/0009-ui-prinzipien-eink.md) | M0 | akzeptiert |
| ADR-0010 | [Kein Backend, statische Auslieferung](../adr/0010-kein-backend-statisches-hosting.md) | M0 | akzeptiert |

## Offene Punkte

- Kurzes Knacken beim Fortsetzen, wenn Chrome nach längerer Hintergrundzeit wieder geöffnet wird (Abnahme M1, akzeptiert). Mögliche Ursache: Der AudioContext wird vom System unterbrochen und ohne Einblenden fortgesetzt. Erst bei Bedarf untersuchen.

- Lässt sich RGBDS inklusive `rgbfix` sauber als WASM bauen, oder gibt es ein gepflegtes WASM-Paket mit passender Lizenz?
- Lizenz und Pflegezustand von hUGEDriver und hardware.inc zum Zeitpunkt der Einbindung.
- Umfang des Debug-Zugriffs am Emulator-Port (Speicher-Watch, Schreib-Breakpoints): Hooks sind laut ADR-0006 vorhanden, die Umsetzung folgt in M4.
- RGBDS wird nur für Linux x86_64 automatisch geladen (`scripts/fetch-rgbds.ts`); macOS/Windows sind offen.
- Lizenzangaben im Briefing sind nicht verifiziert und müssen anhand der LICENSE-Dateien geprüft werden.
