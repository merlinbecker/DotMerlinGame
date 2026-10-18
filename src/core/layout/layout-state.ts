import type { ViewTypeId } from '../view/view-contract.ts';
import type { JsonValue } from '../types.ts';

export interface SlotContent {
  readonly viewTypeId: ViewTypeId;
  readonly viewState: JsonValue;
}

/**
 * Which view sits in which slot, in grid order; `null` is an empty slot. Length 2–16. Contains
 * no project, ROM or emulator data (Constitution IV).
 */
export interface LayoutState {
  readonly version: 1;
  readonly slots: readonly (SlotContent | null)[];
  /** Index of the maximized slot (must be occupied) or null. Only layout, never emulator state. */
  readonly maximizedSlot: number | null;
}
