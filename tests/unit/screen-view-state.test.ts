import { describe, expect, it } from 'vitest';
import { INITIAL_SCREEN_STATE, screenDefinition, type ScreenViewState } from '../../src/views/screen/definition.ts';

describe('screen view state', () => {
  it('starts in normal mode with e-ink defaults from data-model.md (US5-AS4)', () => {
    expect(INITIAL_SCREEN_STATE).toEqual({ mode: 'normal', einkEveryNthFrame: 15, einkMapping: 'contrast', einkDither: false });
  });

  it('round-trips through serialize and deserialize', () => {
    const state: ScreenViewState = { mode: 'eink', einkEveryNthFrame: 4, einkMapping: 'linear', einkDither: true };
    expect(screenDefinition.deserialize(screenDefinition.serialize(state))).toEqual(state);
  });

  it.each([null, 'x', { mode: 'eink', einkEveryNthFrame: 7 }, { mode: 'other' }])('falls back to valid values for %o', (json) => {
    const state = screenDefinition.deserialize(json);
    expect(['normal', 'eink']).toContain(state.mode);
    expect([4, 6, 15, 30]).toContain(state.einkEveryNthFrame);
  });
});
