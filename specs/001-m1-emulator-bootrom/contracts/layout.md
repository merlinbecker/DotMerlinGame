# Vertrag: Layout-Zustand (M1)

## LayoutState – Änderung gegenüber M0

```ts
export interface LayoutState {
  readonly version: 1;
  readonly slots: readonly (SlotContent | null)[];
  /** NEW: index into slots of the maximized slot, or null. Must point to a non-null slot. */
  readonly maximizedSlot: number | null;
}
```

Regeln:
- Enthält weiterhin keine ROM-, Projekt- oder Emulatordaten (Constitution IV, FR-013/FR-024).
- Persistenz in `localStorage` unter einem aus `PROJECT_NAME` abgeleiteten Schlüssel. Ungültiger oder
  fremder Inhalt → Standardlayout, kein Absturz.
- Ändert sich die Slot-Zahl (z. B. Drehen oder anderes Gerät), wird der Inhalt in Rasterreihenfolge
  übernommen. Überzählige Belegungen fallen weg. `maximizedSlot` wird auf `null` gesetzt, wenn der Index
  nicht mehr gültig ist.
- Standardbelegung beim ersten Start: Slot 0 = `screen`, Slot 1 = `controller`, weitere Slots in der
  Reihenfolge `rom-info`, `memory-map`, danach leer.

## Bedienung (Raster, `src/app/layout`)

- View-Wechsel: nur Pfeiltasten in der Kopfleiste („Previous view“/„Next view“), zyklisch über die vier
  Views. **Keine Wischgeste** (PI, 2026-10-18: Gesten sind fehleranfällig; Briefing angepasst).
- Zoom: nur über den Zoom-Schalter in der Kopfleiste jedes belegten Slots („Maximize“/„Restore“,
  `aria-pressed`). Das wirkt sofort, ohne Animation. **Keine Zoom-Geste** (PI, 2026-10-18: sparsam mit
  Gesten). Ein Doppeltipp auf den Inhalt bleibt Sache des Views, im Controller also eine Spieleingabe.
