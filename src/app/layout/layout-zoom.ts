import type { LayoutState } from '../../core/index.ts';

/** Maximizes an occupied slot or restores the grid; the state lives only in the layout (FR-024). */
export function toggleMaximize(layout: LayoutState, index: number): LayoutState {
  if (!layout.slots[index]) return layout;
  return { ...layout, maximizedSlot: layout.maximizedSlot === index ? null : index };
}

/** Slots hidden by a maximized slot count as not visible (no frame updates). */
export function isSlotShown(layout: LayoutState, index: number): boolean {
  return layout.maximizedSlot === null || layout.maximizedSlot === index;
}
