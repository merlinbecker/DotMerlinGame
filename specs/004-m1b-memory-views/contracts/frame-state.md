# Vertrag: Inspektionsdaten im Frame-Zustand

Ort: `src/core/events/frame-state.ts` und `frame-state-hub.ts`. Die Typen erweitern die Verträge aus M1
([../../001-m1-emulator-bootrom/contracts/events-and-frame-state.md](../../001-m1-emulator-bootrom/contracts/events-and-frame-state.md))
nur um Ergänzungen (Constitution IV, research.md R5).

## Typen

```ts
/** Frame-konsistenter Blick in den Speicher; nur lesend. Alle Arrays sind Kopien, außer `rom`. */
export interface InspectionSnapshot {
  /** Das geladene ROM, eine Kopie pro Ladevorgang; dieselbe Referenz in allen Snapshots dieses ROMs. Nie verändern. */
  readonly rom: Uint8Array;
  /** Aktuell bei $4000–$7FFF eingeblendete ROM-Bank. */
  readonly romBank: number;
  /** Bank bei $0000–$3FFF (≠ 0 nur bei MBC1-Sonderfällen; Wert des Cores). */
  readonly rom0Bank: number;
  /** 8 KiB, $8000–$9FFF, innerer Zustand (auch während der LCD-Sperre). */
  readonly vram: Uint8Array;
  /** 8 KiB, $C000–$DFFF. */
  readonly wram: Uint8Array;
  /** 160 Byte, $FE00–$FE9F, innerer Zustand. */
  readonly oam: Uint8Array;
  /** 128 Byte, $FF00–$FF7F, Rohwerte; DIV aus dem internen Zähler (research.md R3). */
  readonly io: Uint8Array;
  /** 127 Byte, $FF80–$FFFE. */
  readonly hram: Uint8Array;
  /** $FFFF */
  readonly ie: number;
  /** null, wenn das Modul laut Core kein RAM hat. */
  readonly cartRam: CartRamSnapshot | null;
  readonly cpu: { readonly ime: boolean; readonly halted: boolean };
}

export interface CartRamSnapshot {
  /** Alle Bänke hintereinander, je 8 KiB (MBC2: siehe research.md R11). */
  readonly bytes: Uint8Array;
  readonly bankCount: number;
  /** Aktuell bei $A000–$BFFF eingeblendete Bank. */
  readonly bank: number;
  /** false = vom Spiel gesperrt; null = Modul ohne Sperre (kein MBC). */
  readonly enabled: boolean | null;
}

export interface FrameSnapshot {
  // … unverändert aus M1 …
  /** null, solange kein Slot Inspektionsdaten angemeldet hat. */
  readonly inspection: InspectionSnapshot | null;
}

export interface FrameStatePublisher extends FrameStateSource {
  // … unverändert aus M1 …
  /** true → ab jetzt gebaute Snapshots enthalten `inspection`; die App setzt das aus frame-demand.ts. */
  setInspectionDemand(active: boolean): void;
  /**
   * Art der gerade laufenden Benachrichtigung: 'frame' für einen emulierten Frame, 'request' für eine
   * Lieferung auf Anforderung. Nur während eines subscribe-Callbacks gültig; nur für die App (Slot-Quellen),
   * Views sehen es nicht (ihr FrameStateSource bleibt unverändert).
   */
  getDeliveryKind(): 'frame' | 'request';
}

export interface FrameStateHub extends FrameStatePublisher {
  // … unverändert aus M1 …
  /** Merkt sich den aktuellen Stand, ohne ihn auszuliefern (nach Laden, Reset, Halt; research.md R6). */
  prime(build: () => FrameSnapshot): void;
}
```

## Regeln

1. **Konsistenz**: `registers`, `flags`, `screen` und `inspection` stammen aus demselben Frame.
2. **Keine Nebenwirkung**: Das Bauen von `inspection` verändert den Core nicht. Gleiche Bild- und
   Tonausgabe mit und ohne Bedarf, geprüft über 300 Frames je Test-ROM (SC-003, research.md R1/R2).
3. **Bedarf**: `inspection` ist genau dann nicht `null`, wenn beim Bau `setInspectionDemand(true)` aktiv
   war. Die App setzt den Bedarf aus den sichtbaren Slots, deren View `inspects: true` erklärt
   (`frame-demand.ts`).
4. **Kopien**: `vram`, `wram`, `oam`, `io`, `hram` und `cartRam.bytes` sind pro Snapshot neu, also nie
   ein Blick in den WASM-Heap. `rom` ist pro geladenem ROM eine Kopie, die dieselbe Referenz bleibt.
5. **`requestSnapshot()` nach `prime()`** liefert den Stand zum Zeitpunkt des Aufrufs, auch vor dem ersten
   emulierten Frame.
6. **Bündeln**: Mehrere `requestSnapshot()`-Aufrufe im selben Task führen zu genau einem Bau. Der Hub
   plant ihn per `queueMicrotask` und liefert einmal aus. Läuft vorher ein echter Frame, deckt dieser die
   Anforderung ab.
7. **Kein Frame-Ersatz**: Der Hub kennzeichnet jede Lieferung selbst über `getDeliveryKind()`. Slots, die
   nichts angefordert haben, ignorieren Lieferungen der Art `'request'`: kein Neuzeichnen, kein
   Weiterzählen der Drosselung (contracts/view-contract.md). Die `frame`-Nummer wird dafür nicht verglichen,
   weil der Adapter sie nach Laden und Reset auf 0 zurücksetzt (Entscheidung des Projektinhabers
   2026-10-26, Analyse-Befund F1).
8. **Bereiche ohne Speicher** (`$E000–$FDFF` Echo, `$FEA0–$FEFF`) enthält der Snapshot nicht. Der Hex-View
   bietet sie nicht an.

## Tests

| Test | Prüft |
|---|---|
| `tests/unit/frame-state-hub.test.ts` (erweitert) | Bedarf an/aus, `prime` + `requestSnapshot` vor dem ersten Frame, fünf Anforderungen im selben Task ergeben genau einen Bau, `getDeliveryKind()` ist im Callback `'request'` bzw. `'frame'` |
| `tests/emulator/inspection.test.ts` (neu) | Inhalte gegen Test-ROMs (SC-001), Kopie statt Heap-Sicht, ROM-Referenz stabil |
| `tests/emulator/inspection-identity.test.ts` (neu) | Regel 2 (SC-003), läuft zuerst gegen den M1-Code (research.md R2) |
| `tests/contract/events.test-d.ts` (erweitert) | `inspection` ist im Typ optional erreichbar, nur lesend |
