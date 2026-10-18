import { describe, expect, it } from 'vitest';
import type { LayoutState } from '../../src/core/index.ts';
import { isSlotShown, toggleMaximize } from '../../src/app/layout/layout-zoom.ts';

const layout: LayoutState = {
  version: 1,
  slots: [{ viewTypeId: 'screen', viewState: null }, { viewTypeId: 'controller', viewState: null }, null],
  maximizedSlot: null,
};

describe('layout zoom (FR-023, FR-024)', () => {
  it('maximizes an occupied slot and restores the grid', () => {
    const maximized = toggleMaximize(layout, 1);
    expect(maximized.maximizedSlot).toBe(1);
    expect(toggleMaximize(maximized, 1).maximizedSlot).toBeNull();
  });

  it('switches directly to another slot', () => {
    expect(toggleMaximize(toggleMaximize(layout, 0), 1).maximizedSlot).toBe(1);
  });

  it('ignores empty slots', () => {
    expect(toggleMaximize(layout, 2)).toBe(layout);
  });

  it('shows all slots normally and only the maximized one while zoomed', () => {
    expect([0, 1, 2].map((i) => isSlotShown(layout, i))).toEqual([true, true, true]);
    const maximized = toggleMaximize(layout, 0);
    expect([0, 1, 2].map((i) => isSlotShown(maximized, i))).toEqual([true, false, false]);
  });

  it('keeps everything else of the layout unchanged', () => {
    expect(toggleMaximize(layout, 0).slots).toBe(layout.slots);
  });
});
