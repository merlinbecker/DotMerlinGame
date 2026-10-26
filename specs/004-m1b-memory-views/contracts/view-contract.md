# Vertrag: View-Vertrag, Ergänzungen für M1b

Ort: `src/core/view/`, `src/core/events/domain-events.ts`, `src/app/layout/`. Basis ist
[../../001-m1-emulator-bootrom/contracts/view-contract.md](../../001-m1-emulator-bootrom/contracts/view-contract.md).
Nur Ergänzungen (FR-003, Constitution IV).

## Ergänzungen

```ts
// view-actions.ts
export type ViewAction =
  | /* … M1 … */
  /** Pro Slot: genau einen aktuellen Snapshot an diesen Slot liefern. Die App behandelt das, nie der Emulator. */
  | { readonly type: 'RequestSnapshot' };

// domain-events.ts
export type DomainEvent =
  | /* … M1 … */
  /** Nach einem Reset der Sitzung, auch im laufenden Zustand (research.md R6). */
  | { readonly type: 'EmulatorReset' };

// view-contract.ts
export interface ViewDefinition<S> {
  /* … M1 … */
  /** Der View liest `FrameSnapshot.inspection`; die App meldet dafür Bedarf an, solange er sichtbar ist. */
  readonly inspects?: true;
}
```

## Verhalten in der App

| Was | Wo | Regel |
|---|---|---|
| `RequestSnapshot` | `Slot.tsx` → `SlotFrameSource.requestSnapshot()` | erreicht die Session nie (wie `SetFrameRate`) |
| Lieferung auf Anforderung | `slot-frame-source.ts` | Nur der anfordernde Slot übernimmt sie. Andere Slots ignorieren jede Lieferung, für die der Hub `getDeliveryKind() === 'request'` meldet: kein Neuzeichnen, Drosselungszähler unverändert (frame-state.md Regel 7) |
| Inspektionsbedarf | `frame-demand.ts` | aktiv, solange ein Slot sichtbar ist, abonniert hat und einen View mit `inspects: true` zeigt |
| Ausgeblendet | `slot-frame-source.ts` | 0 Lieferungen, auch für `RequestSnapshot` (FR-013, SC-004) |
| Neue Views im Zyklus | `layout-store.ts` `DEFAULT_VIEW_ORDER` | Reihenfolge `screen`, `controller`, `rom-info`, `memory-map`, `hex`, `registers`, `tiles`, `tilemaps`, `sprites` |

## Pflichten jedes Speicher-Views

1. Liest nur `context.frameState`, `context.session` und `context.events`. Kein Import aus `src/adapters/`
   (ESLint-Regel aus M0).
2. Setzt beim Einhängen und bei jeder Änderung der Rate `SetFrameRate` gemäß research.md R7.
3. Sendet `RequestSnapshot`:
   - beim Einhängen,
   - wenn `visible` wieder `true` wird,
   - bei `RunStateChanged` (`paused`, `halted`, `empty`), `RomLoaded`, `EmulatorReset` und
     `EmulatorHalted`.
4. Header-Aktion „Refresh“ (`id: 'refresh'`) mit Aktion `RequestSnapshot`, in allen fünf Views immer
   vorhanden.
5. Ohne ROM (`session.rom === null`) zeigt er „No ROM loaded“ (FR-015). Fehlt `inspection` noch, zeigt er
   „Waiting for data“.
6. Sendet keine Aktion, die Emulatorzustand ändert. Ein Typ-Test prüft, dass die Views nur
   `SetFrameRate` und `RequestSnapshot` dispatchen (FR-002).

## Tests

| Test | Prüft |
|---|---|
| `tests/contract/view-contract.test-d.ts` | neue Union-Glieder, `inspects` optional |
| `tests/contract/slot-view.test.tsx` | `RequestSnapshot` liefert genau einen Snapshot an genau diesen Slot. Alle anderen Slots erhalten 0 zusätzliche Lieferungen, und ihr Zähler bleibt unverändert (ein 1/s-Slot liefert nicht früher). Ausgeblendet: 0. Bedarf an/aus folgt der Sichtbarkeit |
| `tests/unit/frame-demand.test.ts` | Inspektionsbedarf nur bei sichtbaren `inspects`-Slots |
| `tests/unit/emulator-session.test.ts` | `EmulatorReset` nach Reset, auch im laufenden Zustand |
