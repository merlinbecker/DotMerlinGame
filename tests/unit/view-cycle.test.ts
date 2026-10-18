import { describe, expect, it } from 'vitest';
import { cycleView } from '../../src/app/layout/view-cycle.ts';

const order = ['screen', 'controller', 'rom-info', 'memory-map'];

describe('view cycle (header arrows, no swipe)', () => {
  it('goes to the next view and wraps around', () => {
    expect(cycleView('screen', order, 1)).toBe('controller');
    expect(cycleView('memory-map', order, 1)).toBe('screen');
  });

  it('goes to the previous view and wraps around', () => {
    expect(cycleView('controller', order, -1)).toBe('screen');
    expect(cycleView('screen', order, -1)).toBe('memory-map');
  });

  it('starts an empty or unknown slot with the first or last view', () => {
    expect(cycleView(null, order, 1)).toBe('screen');
    expect(cycleView(null, order, -1)).toBe('memory-map');
    expect(cycleView('gone', order, 1)).toBe('screen');
  });

  it('returns null when no views are available', () => {
    expect(cycleView('screen', [], 1)).toBeNull();
  });
});
