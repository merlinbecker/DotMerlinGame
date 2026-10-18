# ADR-0001: Web-Stack

- **Status**: akzeptiert
- **Datum**: 2026-10-18
- **Meilenstein**: M0

## Kontext

Die IDE läuft vollständig im Browser, mobile-first, ohne Backend. Agenten sollen in kleinen, testbaren Modulen arbeiten können.

## Entscheidung

- TypeScript (strikt), Vite als Build-Werkzeug, React für die UI, Vitest für Unit-, Vertrags- und Typ-Tests, Playwright (nur Chromium) für Abnahmetests.
- Node.js 24 für Build und Werkzeuge; Hilfsskripte sind TypeScript und laufen direkt mit Node.
- **TypeScript 6.0.3 statt 7.x**: typescript-eslint 8.71.2 verlangt `typescript >=4.8.4 <6.1.0`. Wechsel auf TypeScript 7, sobald die Peer-Range es erlaubt.
- Alle Versionen exakt gepinnt, `package-lock.json` versioniert.

## Konsequenzen

- Die Verträge in `src/core/` sind frameworkfrei; nur `src/app/` und `src/views/` kennen React.
- In M0–M3 wird nur Chrome unterstützt und getestet.

## Alternativen

Andere UI-Frameworks (z. B. Preact, Svelte) wurden nicht weiter verfolgt; React ist im Briefing vorgegeben. TypeScript 7 scheitert derzeit an typescript-eslint.

## Bezüge

Briefing Abschnitt 5; `specs/000-m0-scaffold/research.md` R1, R15.
