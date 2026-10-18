# Quickstart: M0 abnehmen

## Voraussetzungen

- Node.js 24 (siehe `.nvmrc`), npm
- Chromium für Playwright: `npx playwright install chromium` (im Codespace mit `--with-deps`)
- Für die Geräteprüfung: Android-Gerät oder E-Ink-Gerät mit Chrome im selben WLAN

## 1. Frischer Klon (SC-006)

```bash
npm ci
npm run dev        # Shell unter der angezeigten URL, auch im WLAN
```

Erwartung: höchstens zwei Befehle bis zur laufenden Shell.

## 2. Gesamtprüfung wie in der CI (SC-001, SC-004, SC-008)

```bash
npm run check
```

Erwartung: alle Stufen grün ([Befehle](contracts/npm-scripts.md)). Die E2E-Stufe belegt automatisch:
kein Service Worker, keine Animationen/Transitions, nur Graustufen, Build-Version sichtbar,
Querformat-Anordnung, Manifest mit Projektname.

## 3. Negativproben (SC-007)

- Lizenz: `npm test -- tests/unit/license-policy` – GPL-, LGPL-, `-or-later`- und Pakete ohne
  Lizenz werden in beiden Stufen korrekt bewertet.
- Secret: `npm test -- tests/tooling/secret-scan` – ein zur Laufzeit erzeugtes Test-Secret wird erkannt.
- ROM-Ignore: `touch test.gb && git status --short` zeigt die Datei nicht; danach `rm test.gb`.

## 4. Manuelle Abnahme am Gerät

1. App in Chrome öffnen, Commit-Hash in der Fußzeile mit `git rev-parse --short HEAD` vergleichen (SC-003).
2. Gerät drehen: Slots wechseln sofort zwischen untereinander und nebeneinander.
3. Graustufen-Screenshot erstellen und ablegen; alle Bedienelemente und Fokuszustände erkennbar (SC-005).
4. Chrome DevTools → Application: Manifest ohne Fehler, kein Service Worker registriert,
   Installierbarkeit prüfen (offener Punkt PNG/SVG, siehe research.md R6).
5. Startzeit bis zur bedienbaren Shell auf Mittelklasse-Smartphone < 3 s (SC-002).

## 5. Doku und Lizenzen (US5)

`docs/arc42/` (Kap. 1–5, 7, 9), `docs/adr/0000-template.md` und ADRs 0001–0003, 0005, 0007–0010,
`LICENSE`, `THIRD_PARTY_LICENSES`, `third_party/` vorhanden.
