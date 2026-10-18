# ADR-0004: Boot-ROM-Strategie

- **Status**: akzeptiert
- **Datum**: 2026-10-18
- **Meilenstein**: M1

## Kontext

Der Emulator braucht beim Start den Zustand, den die Nintendo-Boot-ROM des DMG-01 hinterlässt. Eine
Nintendo-Boot-ROM darf nicht eingebunden werden, und fremde Boot-ROMs (z. B. die von SameBoy) hat der
Projektinhaber ausgeschlossen (Briefing Abschnitt 12, Constitution VI/VII). Gefordert sind ein eigenes
Logo, zwei Startmodi (eigene Boot-ROM, Direktstart), identisches Verhalten in beiden Modi für jedes
Test-ROM (FR-010) und ein optionaler Modus „Hardware-nah“, der Header-Logo und Header-Checksumme prüft
(FR-011).

## Entscheidung

1. **Eigene Boot-ROM** `src/adapters/emulator/bootrom/dmg-boot.asm`, selbst geschrieben in SM83-Assembler
   (MIT). Sie enthält keinen Code und keine Daten der Nintendo- oder SameBoy-Boot-ROMs und wird mit RGBDS
   v1.0.4 gebaut (`npm run bootrom:build`, Herkunft und Prüfung in arc42 7.3 und 8.8).
2. **Größe** genau 256 Byte (`$0000–$00FF`, Pan Docs „Power Up Sequence“), ausgeblendet durch den
   Schreibzugriff auf `$FF50`. Belegung laut Linker-Map:

   | Bereich | Inhalt |
   |---|---|
   | `$00–$1D` | Stack, VRAM löschen, Ton (Kanal 1) einschalten |
   | `$1E–$4B` | Logo-Kacheln kopieren, Tilemap, BGP, LCD an, Ton auslösen |
   | `$4C–$87` | ca. 1 s Logo, LCD aus, VRAM löschen, IF löschen, Zeitabgleich (PAD), LCD an, Warten bis Zeile 153 |
   | `$88–$98` | F setzen, Register setzen |
   | `$99–$A8` | Unterprogramme VRAM löschen, auf Zeile warten |
   | `$A9–$F0` | Logo: 3×3 Kacheln, 1 bpp, 72 Byte (Rahmen mit Punkt nach `public/icons/logo.svg`) |
   | `$F1–$FB` | frei (11 Byte) |
   | `$FC–$FF` | Übergabe: `ld a,$01` · `ldh [$FF50],a` |

3. **Endzustand bei PC=`$0100`** exakt nach Pan Docs, Spalte DMG, als Test (`tests/boot-state/`):
   - CPU: A=`$01`, B=`$00`, C=`$13`, D=`$00`, E=`$D8`, H=`$01`, L=`$4D`, SP=`$FFFE`.
   - F: Z gesetzt, H und C gesetzt, wenn `$014D` ≠ `$00`. F wird ohne Stack über `add a,$FF` erzeugt.
     Beide Zweige sind gleich lang (36 Zyklen), damit weder HRAM noch Timing vom Modul abhängen.
   - Alle I/O-Register der Tabelle, auch die zeitkritischen: DIV=`$AB`, LY=`$00`, STAT=`$85`. Die Übergabe
     liegt deshalb spät in Zeile 153, wo LY schon 0 liest.
4. **Zeitabgleich**: Eine Warteschleife (`PAD`, 28 Zyklen je Durchlauf) legt die Übergabe ins DIV-Fenster
   `$AB`. In SameBoy ergibt PAD 567–575 DIV=`$AB`. Gewählt ist 571, die Mitte des Fensters. Die Gesamtdauer
   (ca. 1,2 s) entspricht bewusst nicht der Nintendo-Boot-ROM, verbindlich ist der Endzustand.
5. **VRAM wird vor der Übergabe gelöscht** (Entscheidung des Projektinhabers). Abweichung zum Original, wo
   das Logo im VRAM stehen bleibt. Laut Pan Docs darf sich kein Spiel darauf verlassen.
6. **Direktstart**: Der Emulator führt für das Spiel keinen Boot-Code aus. Er wendet einen Snapshot an,
   den die eigene Boot-ROM am Übergabepunkt hinterlässt.
   - Den Snapshot erzeugt ein einmaliger Lauf mit einem neutralen Modul: 32 KiB Nullen.
   - Er wird als SameBoy-Save-State gesichert (`dmg_capture_handoff` im Wrapper).
   - Danach wird F nach `$014D` des Spiels gesetzt.
   - Der Lauf über die eigene Boot-ROM wird am Übergabepunkt per Save-State-Rundlauf normalisiert. Das
     betrifft nur die Tonaufbereitung des Emulators, keinen DMG-Hardwarezustand.
   - Beide Modi sind damit am Übergabepunkt identisch: Register, VRAM, WRAM, OAM, I/O, HRAM. Bild und Ton
     bleiben danach für jedes Test-ROM gleich (`tests/boot-state/handoff-equivalence.test.ts`,
     `tests/emulator/modes-identical.test.ts`).
7. **„Hardware-nah“ ohne Nintendo-Logo im Repo**:
   - Geprüft wird in eigenem Code (`src/core/rom/header.ts`): SHA-256 über `$0104–$0133` gegen
     `NINTENDO_LOGO_SHA256` und die Header-Checksumme nach Pan Docs.
   - Die Hash-Konstante wird aus einem mit `rgbfix` erzeugten Referenz-ROM berechnet
     (`npm run roms:build`). Die Logo-Bytes selbst stehen nie im Repo.
   - Bei Abweichung hält der Emulator vor dem ersten Befehl ab `$0100` an und meldet `EmulatorHalted`.
     Das gilt mit eigener Boot-ROM am Übergang und beim Direktstart vor dem ersten Befehl.
   - Abweichung zum Original: Dort hängt die Boot-ROM in einer Endlosschleife. Für das Spiel ist das nicht
     beobachtbar, weil es in beiden Fällen nicht läuft.
   - Ohne „Hardware-nah“ startet das ROM trotzdem, mit Hinweis in der Oberfläche.
8. **Erlaubnis zum Committen**: Die eigene Boot-ROM darf als `generated/dmg-boot.ts` (Bytes als
   TypeScript-Array) mit `BUILD-INFO.json` committet werden. Sie ist eigener Code (MIT) ohne Nintendo- oder
   Fremddaten. Damit ist die Bedingung aus `CLAUDE.md` für committete ROMs erfüllt. Der Dateiname ist
   bewusst nicht `dmg_boot.bin`, das `.gitignore` sperrt diesen Namen.

## Konsequenzen

- Hardware-Treue ist automatisch belegt: SC-001 (Pan-Docs-Werte) und SC-002 (gleiche Ausgabe in beiden
  Modi) laufen in `npm test`.
- Der PAD-Wert hängt am exakten Timing von SameBoy. Bei einem Core-Update prüfen die Boot-Zustandstests
  DIV, STAT und LY erneut. Ein neues Fenster wird dann mit derselben Messung bestimmt.
- Der Direktstart braucht beim ersten Start einen unsichtbaren Lauf der Boot-ROM mit dem neutralen Modul
  (ca. 70 emulierte Frames, im Codespace unter 100 ms).
- Der Wrapper nutzt SameBoy-Interna (`GB_INTERNAL`) nur für das Erkennen des Übergabepunkts.

## Alternativen

- **Boot-ROM von SameBoy** (Expat): vom Projektinhaber ausgeschlossen.
- **Direktstart nur über die Pan-Docs-Tabelle**: verworfen. Die Tabelle beschreibt PPU-Phase, APU-Zustand
  und den Feinanteil des Teilers nicht vollständig. Im Spike liefen die Modi damit auseinander.
- **Unsichtbarer Lauf der Boot-ROM mit dem jeweiligen Spiel**: verworfen. Dann würde für jedes Spiel
  Boot-Code ausgeführt, und die Gleichheit der Modi wäre nur eine Tautologie.
- **Logo-Bytes in der Boot-ROM, Prüfung wie im Original**: verworfen, keine Nintendo-Daten im Repo.
- **Logo im VRAM stehen lassen** (wie im Original): verworfen zugunsten eines leeren VRAM in beiden Modi.

## Bezüge

Briefing Abschnitt 8 (M1) und 12; Constitution VI, VII, X; Pan Docs „Power Up Sequence“, „The Cartridge
Header“, „Specifications“, „Rendering“; `specs/001-m1-emulator-bootrom/research.md` R4–R6;
ADR-0005, ADR-0006; arc42 Kapitel 4, 7.3 und 8.8.
