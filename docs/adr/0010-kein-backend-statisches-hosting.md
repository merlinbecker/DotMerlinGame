# ADR-0010: Kein Backend, statische Auslieferung

- **Status**: akzeptiert
- **Datum**: 2026-10-18
- **Meilenstein**: M0

## Kontext

Alles soll lokal im Browser laufen, ohne Account und ohne Daten auf einem Server. Ein Hoster wird nur zum Ausliefern der App gebraucht.

## Entscheidung

- Es gibt grundsätzlich kein Backend, auch später nicht. Der Build (`dist/`) besteht nur aus statischen Dateien.
- Hosting vorerst über Replit; jeder andere statische Hoster ist ohne Codeänderung möglich. Nichts im Code hängt von einem bestimmten Hoster ab.
- Die App ist ohne Service Worker installierbar: Die Kriterien von Chrome verlangen HTTPS, ein Manifest mit Name, Icons in 192 und 512 px, `start_url` und `display` (web.dev, „What does it take to be installable?“, https://web.dev/articles/install-criteria, Stand 2024-09-19). Ob SVG-Icons genügen, ist dort nicht angegeben; daher werden PNGs mitgeliefert.

## Konsequenzen

Keine Laufzeit-Netzwerkzugriffe. Node.js wird nur für Entwicklung, Build und CI gebraucht.

## Bezüge

Constitution IX; Briefing Abschnitt 12 (Änderungen vom 2026-10-18); Spec M0 FR-020.
