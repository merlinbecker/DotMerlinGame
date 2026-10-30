# Quickstart: M3 prüfen

```sh
npm run check
npm run roundtrip:local   # optional, prüft eigene ROMs aus roms/local/
```

| Szenario | Erwartung | Nachweis |
|---|---|---|
| Jeder Opcode | `rgbasm` erzeugt dieselben Bytes | `tests/assembler/opcodes.test.ts`, FR-011 |
| Alle eigenen Test-ROMs | byte-identisch | `tests/roundtrip/`, SC-001 |
| Bekannte Code-Daten-Aufteilung | keine Daten als Code | `tests/roundtrip/known-split`, SC-002 |
| Ungültiger Header | Import möglich, Bytes unverändert | `tests/roundtrip/` |
| Größe kein Vielfaches von 16 KiB | Import möglich, Ergebnis `padded` | `tests/roundtrip/` |
| Import in der App | neues Projekt, baut, Ergebnis sichtbar | `tests/e2e/m3-import` |
| ROM im Projekt | keines, auch nicht im ZIP | `tests/e2e/m3-import` |

## Am Gerät

Smartphone: 32-KiB-ROM unter 10 s, 1-MiB-ROM unter 60 s, Oberfläche bleibt bedienbar (SC-003, SC-004). Ergebnisse in `docs/abnahme/m3.md`.
