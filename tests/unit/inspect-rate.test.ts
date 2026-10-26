import { describe, expect, it } from 'vitest';
import { INITIAL_RATE, parseRate, toPublishRate } from '../../src/views/inspect-common/rate.ts';

describe('memory view rates (FR-010, research.md R7)', () => {
  it('starts at one per second', () => {
    expect(INITIAL_RATE).toBe('second');
  });

  it('maps the rates to publish rates of the slot', () => {
    expect(toPublishRate('live')).toEqual({ kind: 'reduced', everyNthFrame: 6 });
    expect(toPublishRate('second')).toEqual({ kind: 'reduced', everyNthFrame: 60 });
    expect(toPublishRate('manual')).toEqual({ kind: 'on-demand' });
  });

  it.each([undefined, null, 'fast', 3])('falls back to one per second for %s', (json) => {
    expect(parseRate(json)).toBe('second');
  });
});
