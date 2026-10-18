# ADR-0007: Lizenz (MIT) und Umgang mit Marke und Namen

- **Status**: akzeptiert
- **Datum**: 2026-10-18
- **Meilenstein**: M0

## Kontext

Das Repo ist öffentlich. Das Projekt richtet sich an Game-Boy-Homebrew, darf aber keine Markenrechte verletzen oder geschützte Inhalte verteilen.

## Entscheidung

- Projektlizenz ist MIT (`LICENSE`).
- Kein "Game Boy" oder "Boy" im Projektnamen, Logo oder Paketnamen. Beschreibend ("für Game-Boy-Homebrew") ist erlaubt.
- Der Projektname steht im Code nur in `src/config/project.ts`. Der npm-Paketname `dotmerlingame` ist ein technischer Bezeichner und gilt nicht als zweite Stelle.
- Das Logo ist selbst gestaltet (schwarzer Punkt in schwarzem Rahmen) und enthält keine Nintendo-Elemente.
- Nie im Repo: kommerzielle ROMs, deren Disassemblies, Nintendo-Boot-ROMs, Secrets, persönliche Pfade. `.gitignore` schließt ROM-Endungen und Boot-ROM-Namen aus; ein Secret-Scan läuft in jeder Prüfung.

## Konsequenzen

Tests nutzen nur selbst gebaute oder frei lizenzierte ROMs. Lizenzangaben sind kein Rechtsrat.

## Bezüge

Briefing Abschnitte 2, 7; Constitution VI.
