import { beforeEach, describe, expect, it } from 'vitest';
import { PROJECT_NAME } from '../../src/config/project.ts';
import { DEFAULT_VIEW_ORDER, fitLayout, VIEW_CYCLE_ORDER, LAYOUT_KEY, loadLayout, saveLayout } from '../../src/app/layout/layout-store.ts';

const slot = (viewTypeId: string) => ({ viewTypeId, viewState: null });

describe('layout store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('derives the storage key from the project name', () => {
    expect(LAYOUT_KEY).toContain(PROJECT_NAME.toLowerCase());
  });

  it('starts with screen, controller, rom-info, memory-map, then empty slots', () => {
    expect(DEFAULT_VIEW_ORDER).toEqual(['screen', 'controller', 'rom-info', 'memory-map']);
    const layout = loadLayout(6);
    expect(layout.slots.map((s) => s?.viewTypeId ?? null)).toEqual(['screen', 'controller', 'rom-info', 'memory-map', null, null]);
    expect(layout.maximizedSlot).toBeNull();
    expect(layout.version).toBe(1);
  });

  it('cycles through the M1 views, the memory views of M1b, then the M2 views', () => {
    expect(VIEW_CYCLE_ORDER).toEqual(['screen', 'controller', 'rom-info', 'memory-map', 'hex', 'registers', 'tiles', 'tilemaps', 'sprites', 'editor', 'build', 'project']);
  });

  it('round-trips a saved layout', () => {
    const layout = { version: 1 as const, slots: [slot('rom-info'), slot('screen')], maximizedSlot: 1 };
    saveLayout(layout);
    expect(loadLayout(2)).toEqual(layout);
  });

  it.each(['not json', '{"version":2,"slots":[]}', '{"version":1,"slots":"x"}', '[]'])('falls back to the default for %s', (raw) => {
    localStorage.setItem(LAYOUT_KEY, raw);
    expect(loadLayout(2).slots.map((s) => s?.viewTypeId)).toEqual(['screen', 'controller']);
  });

  it('keeps contents in grid order and drops extras when the slot count shrinks', () => {
    const layout = { version: 1 as const, slots: [slot('a'), slot('b'), slot('c'), null], maximizedSlot: 2 };
    expect(fitLayout(layout, 2)).toEqual({ version: 1, slots: [slot('a'), slot('b')], maximizedSlot: null });
  });

  it('pads with empty slots when the slot count grows', () => {
    const layout = { version: 1 as const, slots: [slot('a'), slot('b')], maximizedSlot: 0 };
    expect(fitLayout(layout, 4)).toEqual({ version: 1, slots: [slot('a'), slot('b'), null, null], maximizedSlot: 0 });
  });

  it('drops a maximized index that points to an empty slot', () => {
    const layout = { version: 1 as const, slots: [slot('a'), null], maximizedSlot: 1 };
    expect(fitLayout(layout, 2).maximizedSlot).toBeNull();
  });
});
