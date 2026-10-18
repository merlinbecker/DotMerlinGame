export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/** Grid of square slots: 1–4 columns and rows, at least two slots (data-model.md GridSpec). */
export interface GridSpec {
  readonly columns: number;
  readonly rows: number;
  readonly slotSize: number;
}

const MAX_PER_AXIS = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Fits as many square slots of at least `minSlotSize` as possible into the viewport. If not even
 * two slots fit, slots shrink below the minimum instead of dropping below two (research.md R9).
 */
export function computeGrid(viewport: Viewport, minSlotSize: number): GridSpec {
  const { width, height } = viewport;
  if (width <= 0 || height <= 0) return { columns: 1, rows: 2, slotSize: 0 };

  let columns = clamp(Math.floor(width / minSlotSize), 1, MAX_PER_AXIS);
  let rows = clamp(Math.floor(height / minSlotSize), 1, MAX_PER_AXIS);
  if (columns * rows < 2) {
    if (width >= height) {
      columns = 2;
      rows = 1;
    } else {
      columns = 1;
      rows = 2;
    }
  }

  const slotSize = Math.floor(Math.min(width / columns, height / rows));
  return { columns, rows, slotSize };
}
