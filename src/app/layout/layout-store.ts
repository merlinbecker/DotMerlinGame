import { PROJECT_NAME } from '../../config/project.ts';
import type { JsonValue, LayoutState, SlotContent } from '../../core/index.ts';

export const LAYOUT_KEY = `${PROJECT_NAME.toLowerCase()}:layout`;

/** First-start assignment (contracts/layout.md); also the cycle order of the header arrows. */
export const DEFAULT_VIEW_ORDER: readonly string[] = ['screen', 'controller', 'rom-info', 'memory-map'];

/** Order of the header arrows; views that are not registered are skipped. The first-start layout stays DEFAULT_VIEW_ORDER. */
export const VIEW_CYCLE_ORDER: readonly string[] = [...DEFAULT_VIEW_ORDER, 'hex', 'registers', 'tiles', 'tilemaps', 'sprites'];

function defaultLayout(slotCount: number): LayoutState {
  return {
    version: 1,
    slots: Array.from({ length: slotCount }, (_, i) => {
      const viewTypeId = DEFAULT_VIEW_ORDER[i];
      return viewTypeId ? { viewTypeId, viewState: null } : null;
    }),
    maximizedSlot: null,
  };
}

function isSlotContent(value: unknown): value is SlotContent {
  return typeof value === 'object' && value !== null && typeof (value as { viewTypeId?: unknown }).viewTypeId === 'string' && 'viewState' in value;
}

function parse(raw: string | null): LayoutState | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as { version?: unknown; slots?: unknown; maximizedSlot?: unknown };
    if (value.version !== 1 || !Array.isArray(value.slots)) return null;
    if (!value.slots.every((s) => s === null || isSlotContent(s))) return null;
    const maximizedSlot = typeof value.maximizedSlot === 'number' ? value.maximizedSlot : null;
    return { version: 1, slots: value.slots as (SlotContent | null)[], maximizedSlot };
  } catch {
    return null;
  }
}

/** Adapts a layout to a new slot count: grid order kept, extras dropped, invalid maximize reset. */
export function fitLayout(layout: LayoutState, slotCount: number): LayoutState {
  const slots = Array.from({ length: slotCount }, (_, i) => layout.slots[i] ?? null);
  const maximized = layout.maximizedSlot;
  const maximizedSlot = maximized !== null && slots[maximized] ? maximized : null;
  return { version: 1, slots, maximizedSlot };
}

/** Layout lives in localStorage (small setting, Constitution IX) and never holds ROM or emulator data. */
export function loadLayout(slotCount: number): LayoutState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LAYOUT_KEY);
  } catch {
    raw = null;
  }
  return fitLayout(parse(raw) ?? defaultLayout(slotCount), slotCount);
}

export function saveLayout(layout: LayoutState): void {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // Storage unavailable (private mode, quota): the layout simply is not remembered.
  }
}

export function withViewState(layout: LayoutState, index: number, viewState: JsonValue): LayoutState {
  const slots = layout.slots.map((slot, i) => (i === index && slot ? { ...slot, viewState } : slot));
  return { ...layout, slots };
}
