# DotMerlinGame auf Replit

## Projektregeln

Vor Änderungen `CLAUDE.md` und `docs/BOOTSTRAP-BRIEFING.md` beachten. Bestehende
React-/TypeScript-/Vite-Struktur beibehalten. Die Anwendung läuft ausschließlich
im Browser; kein Backend, keine Datenbank und keine Secrets erforderlich.

## Starten

- Laufzeit: Node.js 24 (über `.replit` eingerichtet).
- Abhängigkeiten bei einem frischen Checkout: `npm ci`.
- Replit-Run startet den Workflow `Start application` mit `npm run dev`.
- Vite lauscht auf `0.0.0.0:5000`, akzeptiert die Preview-Proxy-Hosts und bricht
  bei belegtem Port ab, statt auf einen anderen Port auszuweichen.
- Emulator-WASM und eigene Boot-ROM sind bereits im Repository enthalten.
  Für den normalen Start ist kein Neubau des Emulator-Cores erforderlich.
- ROMs werden lokal im Browser geöffnet; gespeicherte Daten liegen in IndexedDB.

## Prüfen

- `npm run build`: Typprüfung und statischer Build nach `dist/`.
- `npm run lint`: ESLint und Stylelint.
- `npm test`: lädt zunächst das festgelegte RGBDS-Werkzeug nach `.tools/`,
  baut eigene Test-ROMs und führt Vitest aus.
- `npm run test:e2e`: benötigt einen vorherigen Build und Playwright Chromium
  (`npx playwright install chromium`). Startet seinen eigenen Preview-Server auf
  Port 4173; unabhängig vom Replit-Dev-Server auf Port 5000.
  Die benötigten Linux-Bibliotheken sind unter `[nix].packages` in `.replit`
  eingerichtet. Browser-Downloads unter `.cache/` sind von Git und Publishing
  ausgeschlossen.
- `npm run check`: vollständige lokale Prüfstrecke, siehe `package.json`.
- `npm run core:build` und `npm run core:verify` verwenden Docker und sind daher
  nicht für diese Replit-Umgebung vorgesehen; dafür die vorhandene GitHub-CI nutzen.
