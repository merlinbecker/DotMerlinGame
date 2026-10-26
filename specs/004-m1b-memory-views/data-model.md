# Datenmodell: M1b – Speicher-Ansichten

Die Typen des Emulator-Vertrags stehen in [contracts/frame-state.md](contracts/frame-state.md), die
Erweiterungen des View-Vertrags in [contracts/view-contract.md](contracts/view-contract.md). Hier stehen
die View-Zustände (Layout) und die reinen Domänenfunktionen.

## Gemeinsam: Aktualisierungsrate

```ts
/** Clarification Q2: Startwert 'second'. Abbildung auf PublishRate: research.md R7. */
export type InspectRate = 'live' | 'second' | 'manual';
```

Ungültige oder fehlende Werte werden beim `deserialize` zu `'second'`.

## View-Zustände (serialisiert im Layout, je Slot)

| View (`typeId`) | Zustand | Startwert | Regeln |
|---|---|---|---|
| Hex (`hex`) | `area`: `'rom' \| 'vram' \| 'cart-ram' \| 'wram' \| 'oam' \| 'io' \| 'hram' \| 'ie'`<br>`romBank`<br>`ramBank`<br>`topAddress`<br>`rate`<br>`selected: number \| null` | `area: 'wram'`<br>`romBank: 0`<br>`ramBank: 0`<br>`topAddress: $C000`<br>`rate: 'second'`<br>`selected: null` | Ist die Bank zu groß für das ROM bzw. den RAM, wird sie beim Anzeigen auf 0 gesetzt (Randfall). `topAddress` liegt im Bereich und wird auf die Zeilenbreite abgerundet (FR-005). `selected` ist nur Hervorhebung |
| Registers (`registers`) | `rate` | `'second'` | – |
| Tiles (`tiles`) | `rate`<br>`palette: 'raw' \| 'bgp'`<br>`page`<br>`selected: number \| null` (0–383) | `'second'`<br>`'raw'`<br>`0`<br>`null` | Clarification Q5 |
| Tilemaps (`tilemaps`) | `rate`<br>`palette: 'raw' \| 'bgp'`<br>`map: 'background' \| 'window'`<br>`selected: number \| null` (0–1023) | `'second'`<br>`'raw'`<br>`'background'`<br>`null` | – |
| Sprites (`sprites`) | `rate`<br>`palette: 'raw' \| 'obp'`<br>`page` | `'second'`<br>`'raw'`<br>`0` | – |

Für jeden Zustand gilt `deserialize(serialize(s))` ≡ `s`, wie in M1 per Vertragstest geprüft. Unbekannte
JSON-Felder werden ignoriert.

## Domänenfunktionen (rein, ohne UI, `src/core/inspect/`)

| Modul | Funktion | Quelle |
|---|---|---|
| `io-registers.ts` | `IO_REGISTER_NAMES`: Adresse → Kurzname, 43 DMG-Einträge, Wave-RAM als Bereich | Pan Docs `Hardware_Reg_List.md` (research.md R9) |
| `areas.ts` | Bereichsgrenzen und Banking je Bereich, abgeleitet aus `MEMORY_MAP` (M1). `bytesOf(area, bank, inspection)` gibt den Ausschnitt zurück, nicht vorhandene Bänke liefern `null` | Pan Docs „Memory Map“ |
| `tiles.ts` | `decodeTile(bytes16) → Uint8Array(64)` mit Farbindizes 0–3; `tileAddress(index 0–383)` | Pan Docs „Tile Data“ |
| `tilemap.ts` | `mapBase(lcdc, 'background' \| 'window')`, `tileIndexFor(mapEntry, lcdc) → 0–383` (`$8000`/`$8800`-Methode), `viewport(scx, scy)` als bis zu vier Rechtecke mit Umbruch, `windowOrigin(wx, wy)` | Pan Docs „LCDC“, „Tile Maps“, „Scrolling“ |
| `oam.ts` | `decodeObject(oam, i, lcdc)` gibt `{ y, x, tile, tiles: [top, bottom?], priority, flipX, flipY, palette: 0 \| 1, visible }` zurück | Pan Docs „OAM“ |
| `palette.ts` | `applyPalette(index, bgpOrObp) → Shade 0–3` | Pan Docs „Palettes“ |
| `changes.ts` | `diffBytes(prev, next) → Set<offset>` für den sichtbaren Ausschnitt | FR-011 |
| `hex-layout.ts` | `bytesPerRow(availableWidth, charWidth) → 8 \| 16` und `alignTop(address, bytesPerRow)` | Clarification Q3 |

Die Hardware-Fakten stehen jeweils mit Quellenkommentar (Pan-Docs-Seite) im Code. Unit-Tests prüfen sie
mit Tabellenfällen. Die Integrationstests gegen Test-ROMs prüfen zusätzlich das Zusammenspiel mit dem Core
(FR-016).

## Neue Test-ROMs (`tests/roms/src/`, Quellen committet, Builds nie)

| Name in `roms.json` | Quelle | Inhalt nach dem Start, danach Endlosschleife | Belegt |
|---|---|---|---|
| `inspect-mem` | `inspect-mem.asm` | MBC5 mit 4 RAM-Bänken (`ramSize 0x03`). Jede RAM-Bank hat eigenes Muster, danach ist der RAM gesperrt. Muster in WRAM und HRAM, IE gesetzt, ROM-Bank 3 eingeblendet, ROM-Bänke mit Kennbytes | Hex (US1) |
| `inspect-regs` | `inspect-regs.asm` | A–L, SP mit festen Werten, Flags gesetzt, `di` (IME aus), Schleife `jr @` an fester Adresse; mit `HALTED=1` statt der Schleife `ei` + `halt` ohne freigegebenen Interrupt (IME an, HALT an) | Registers (US2, FR-006) |
| `inspect-gfx` | `inspect-gfx.asm` | Kachelmuster in allen drei Blöcken, BG- und Fenster-Karte, SCX/SCY, WX/WY, BGP und OBP0/1, OAM mit sichtbaren und unsichtbaren Einträgen, 8×8 | Tiles, Tilemaps, Sprites (US3–US5) |
| `inspect-gfx-tall` | `inspect-gfx.asm` mit `TALL=1` | wie oben, `LCDC.2 = 1` (8×16), `$8800`-Adressierung | US4-AS1, US5-AS2 |

Alle Test-ROMs laufen mit eigener Boot-ROM und im Direktstart gleich (Constitution VII, bestehender Test
`modes-identical` wird um sie erweitert).
