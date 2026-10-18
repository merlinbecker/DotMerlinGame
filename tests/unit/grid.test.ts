import { describe, expect, it } from 'vitest';
import { computeGrid } from '../../src/app/layout/grid.ts';

const MIN = 320;

describe('computeGrid', () => {
  it('stacks two slots vertically on a portrait phone', () => {
    expect(computeGrid({ width: 390, height: 812 }, MIN)).toMatchObject({ columns: 1, rows: 2 });
  });

  it('places two slots side by side on a landscape phone', () => {
    expect(computeGrid({ width: 812, height: 390 }, MIN)).toMatchObject({ columns: 2, rows: 1 });
  });

  it('uses more slots on tablets and desktops', () => {
    const grid = computeGrid({ width: 1024, height: 736 }, MIN);
    expect(grid.columns * grid.rows).toBeGreaterThan(2);
  });

  it('never exceeds 4x4', () => {
    expect(computeGrid({ width: 4000, height: 4000 }, MIN)).toMatchObject({ columns: 4, rows: 4 });
  });

  it('keeps at least two slots below the minimum width and shrinks them', () => {
    const grid = computeGrid({ width: 300, height: 500 }, MIN);
    expect(grid.columns * grid.rows).toBeGreaterThanOrEqual(2);
    expect(grid.slotSize).toBeLessThan(MIN);
    expect(grid.slotSize * grid.columns).toBeLessThanOrEqual(300);
  });

  it('keeps two slots on a small landscape phone', () => {
    const grid = computeGrid({ width: 560, height: 280 }, MIN);
    expect(grid).toMatchObject({ columns: 2, rows: 1 });
    expect(grid.slotSize * grid.columns).toBeLessThanOrEqual(560);
  });

  it('produces square slots that fit the viewport', () => {
    for (const viewport of [
      { width: 390, height: 812 },
      { width: 1280, height: 688 },
      { width: 768, height: 990 },
    ]) {
      const grid = computeGrid(viewport, MIN);
      expect(grid.slotSize * grid.columns).toBeLessThanOrEqual(viewport.width);
      expect(grid.slotSize * grid.rows).toBeLessThanOrEqual(viewport.height);
    }
  });

  it('handles zero and negative sizes', () => {
    expect(computeGrid({ width: 0, height: 0 }, MIN)).toEqual({ columns: 1, rows: 2, slotSize: 0 });
    expect(computeGrid({ width: -10, height: 500 }, MIN)).toEqual({ columns: 1, rows: 2, slotSize: 0 });
  });
});
