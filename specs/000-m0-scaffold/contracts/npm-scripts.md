# Vertrag: Befehle (npm-Skripte)

Diese Befehle sind die Schnittstelle für Menschen, Agenten und CI (FR-010). Sie werden nach M0 in
`CLAUDE.md` eingetragen.

| Befehl | Wirkung | Erwartung |
|---|---|---|
| `npm run dev` | Vite-Dev-Server, auch im WLAN erreichbar (`--host`) | kein Service Worker |
| `npm run build` | Typprüfung + Produktions-Build nach `dist/` | nur statische Dateien |
| `npm run preview` | liefert `dist/` lokal aus | Grundlage der E2E-Tests |
| `npm test` | Vitest (Unit, Vertrag, Typ-Tests) | grün; `it.todo` erlaubt |
| `npm run test:e2e` | Playwright gegen `preview`, nur Chromium | grün |
| `npm run lint` | ESLint + Stylelint | 0 Fehler |
| `npm run typecheck` | `tsc --noEmit` über `src`, `tests`, `build`, `scripts` | 0 Fehler |
| `npm run licenses` | zweistufiger Lizenz-Check + Aktualitätsprüfung `THIRD_PARTY_LICENSES` | exit 0 |
| `npm run licenses:generate` | erzeugt `THIRD_PARTY_LICENSES` neu | – |
| `npm run secrets` | secretlint über `git ls-files` | exit 0 |
| `npm run check` | lint → typecheck → test → build → test:e2e → licenses → secrets | entspricht exakt der CI |

Exit-Code ≠ 0 bei jedem Fehler; `check` bricht beim ersten Fehler ab.
