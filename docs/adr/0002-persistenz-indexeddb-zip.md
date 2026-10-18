# ADR-0002: Persistenz in IndexedDB, ZIP für Export/Import

- **Status**: akzeptiert
- **Datum**: 2026-10-18
- **Meilenstein**: M0 (Umsetzung ab M1/M2)

## Kontext

Es gibt kein Backend. Projekte, ROMs (in M1 als Übergang) und Layouts müssen lokal und offline verfügbar sein und sich zwischen Geräten übertragen lassen.

## Entscheidung

- Projektdaten liegen in IndexedDB. localStorage nur für kleine Einstellungen.
- Austausch und Sicherung von Projekten als ZIP-Datei.
- Beide stehen hinter Ports (`ProjectStorePort`, `ArchivePort` in `src/core/ports/`).
- Die ZIP-Bibliothek muss eine geprüfte Lizenz aus der Freigabeliste haben (ADR-0003).

## Konsequenzen

Daten verlassen das Gerät nur durch bewussten Export. Speicherplatzgrenzen des Browsers müssen ab M1 mit klaren Meldungen behandelt werden.

## Alternativen

Nur localStorage (zu klein, synchron); File System Access API (nicht überall verfügbar, kein Ersatz für lokale Persistenz).

## Bezüge

Briefing Abschnitte 2, 5; Constitution IX.
