# Data Model: M1 – Emulator-Kern und eigene Boot-ROM

Typen und Regeln der in M1 neuen oder geänderten Entitäten. Die genaue TypeScript-Form steht in
[contracts/](contracts/). Werte und Bedeutungen der Header-Felder stammen aus Pan Docs („The
Cartridge Header“, „Memory Map“) und werden bei der Umsetzung von dort übernommen.

## StoredRom (persistent, IndexedDB, genau ein Eintrag `current`)

| Feld | Typ | Regel |
|---|---|---|
| `bytes` | `Uint8Array` | Größe passt zum ROM-Größen-Byte des Headers, sonst wird das ROM abgelehnt |
| `fileName` | string | nur zur Anzeige |
| `loadedAt` | ISO 8601 | |
| `battery` | `Uint8Array \| null` | nur bei Cartridge-Typen mit Batterie, Größe aus dem RAM-Größen-Byte |

- Es gibt immer höchstens einen Eintrag (FR-002).
- Ein neues ROM ersetzt das alte in **einer** Transaktion, der Spielstand wird mit gelöscht (FR-026).
- Wird nie im Projektspeicher abgelegt (ADR-0005, Nachtrag M1).

## RomHeaderInfo (abgeleitet, nicht gespeichert)

Wird bei jedem Laden aus `StoredRom.bytes` berechnet (`src/core/rom/header.ts`).

| Feld | Typ | Herkunft |
|---|---|---|
| `title` | string | Titelbereich des Headers |
| `cartridgeType` | `{ code: number; mbc: 'none' \| 'mbc1' \| 'mbc3' \| 'mbc5' \| 'other'; ram: boolean; battery: boolean }` | `$0147` |
| `romSizeBytes`, `romBanks` | number | `$0148` (Bänke à 16 KiB) |
| `ramSizeBytes` | number | `$0149` |
| `cgbFlag` | `'dmg' \| 'cgb-compatible' \| 'cgb-only'` | `$0143` |
| `headerChecksumValid` | boolean | `$014D` gegen die Formel aus Pan Docs |
| `logoValid` | boolean | SHA-256 über `$0104–$0133` gegen `NINTENDO_LOGO_SHA256` (generiert) |

Validierung beim Laden:
- zu klein, ROM-Größe passt nicht zum Header, Header nicht lesbar → `RomRejected` mit Grund `invalid`
- `cgb-only` → `RomRejected` mit Grund `cgb-only` (FR-017)
- Cartridge-Typ-Code, der in der Pan-Docs-Tabelle „The Cartridge Header“ (`$0147`) nicht definiert ist →
  `RomRejected` mit Grund `unsupported-cartridge`. Definierte, aber nicht zugesicherte Typen (`other`,
  z. B. MBC2) werden ohne Zusicherung gestartet
- `logoValid`/`headerChecksumValid` false: mit „Hardware-nah“ folgt `EmulatorHalted` am Übergabepunkt,
  ohne nur ein Hinweis

## EmulatorSettings (persistent, localStorage)

| Feld | Typ | Default |
|---|---|---|
| `bootMode` | `'own-boot-rom' \| 'direct-start'` | `'own-boot-rom'` |
| `hardwareChecks` | boolean | `false` |

## AudioSettings (persistent, localStorage)

| Feld | Typ | Regel |
|---|---|---|
| `muted` | boolean | wirkt sofort, Emulator läuft weiter |
| `volume` | number | 0–1, in festen Stufen (z. B. 0,1), keine Slider-Feinmotorik nötig |

Zusätzlich flüchtig: `unlocked: boolean` (Browser hat Tonausgabe freigegeben).

## RunState (flüchtig)

`'empty'` (kein ROM) → `'running'` ⇄ `'paused'` → (`'halted'` bei „Hardware-nah“-Fehler).

Übergänge:
- `LoadRom` aus jedem Zustand → `running`, oder `halted`, oder zurück zum vorherigen Zustand bei `RomRejected`
  (Edge Case: Emulator bleibt im vorherigen Zustand)
- `Pause` / Hintergrund-Tab → `paused`. `Resume` / Vordergrund → `running`, aber nur, wenn vorher
  `running` (Hintergrund setzt nicht fort, was der Nutzer pausiert hat)
- `Reset` → Neustart im aktuellen `bootMode`, Spielstand bleibt

## SessionState (flüchtig, für Views lesbar)

Zusammenfassung für Views (`ViewContext.session`), siehe [contracts/view-contract.md](contracts/view-contract.md):
`runState`, `rom: RomHeaderInfo | null`, `fileName`, `settings: EmulatorSettings`, `audio: AudioSettings & { unlocked }`,
`notice` (letzter Hinweis, z. B. ungültiger Header ohne „Hardware-nah“, Speicher voll).

## FrameSnapshot (Änderung gegenüber M0)

Neues Feld `screen: Uint8Array`: 160 × 144 Byte, zeilenweise, Werte nur 0–3 (DMG-Graustufen, 0 = hellste).
Alle anderen Felder wie in M0.

## LayoutState (Änderung gegenüber M0)

Neues Feld `maximizedSlot: number | null`: Index eines belegten Slots oder `null`. Nur Layout, keine
Emulator- oder ROM-Daten. `version` bleibt `1`, weil M0 nie persistiert hat.

## ScreenViewState (Teil von `SlotContent.viewState`)

| Feld | Typ | Default |
|---|---|---|
| `mode` | `'normal' \| 'eink'` | `'normal'` (US5-AS4, Entscheidung PI) |
| `einkEveryNthFrame` | 4 \| 6 \| 15 \| 30 | 15 |
| `einkMapping` | `'contrast'` \| `'linear'` | `'contrast'` |
| `einkDither` | boolean | false |

`deserialize(serialize(s))` ergibt einen gleichwertigen Zustand (View-Vertrag M0).

## MemoryMapRegion (statisch, `src/core/rom/memory-map.ts`)

`{ start, end, name, kind: 'rom-fixed' | 'rom-banked' | 'vram' | 'cart-ram' | 'wram' | 'echo' | 'oam' | 'unusable' | 'io' | 'hram' | 'ie' }`.
Werte aus Pan Docs „Memory Map“, als Konstante mit Quellenverweis und Test (FR-025).
