import { describe, expect, it } from 'vitest';
import { hexDefinition, INITIAL_HEX_STATE, type HexViewState } from '../../src/views/hex/definition.ts';

describe('Hex view state (data-model.md)', () => {
  it('starts in WRAM at $C000 with one update per second', () => {
    expect(hexDefinition.initialState).toEqual({ area: 'wram', romBank: 0, ramBank: 0, topAddress: 0xc000, rate: 'second', selected: null });
    expect(hexDefinition.inspects).toBe(true);
  });

  it('round-trips its state', () => {
    const state: HexViewState = { area: 'cart-ram', romBank: 5, ramBank: 2, topAddress: 0xa080, rate: 'manual', selected: 0xa085 };
    expect(hexDefinition.deserialize(hexDefinition.serialize(state))).toEqual(state);
  });

  it('falls back per field for invalid JSON', () => {
    expect(hexDefinition.deserialize({ area: 'echo', romBank: -1, ramBank: 1.5, topAddress: 0x10000, rate: 'fast', selected: 'x' })).toEqual(INITIAL_HEX_STATE);
    expect(hexDefinition.deserialize(null)).toEqual(INITIAL_HEX_STATE);
    expect(hexDefinition.deserialize({ area: 'io' })).toEqual({ ...INITIAL_HEX_STATE, area: 'io' });
  });

  it('offers Refresh in the header', () => {
    expect(hexDefinition.headerActions?.({} as never)).toEqual([{ id: 'refresh', label: 'Refresh', action: { type: 'RequestSnapshot' } }]);
  });
});
