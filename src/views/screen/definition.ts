import type { JsonValue, ViewDefinition } from '../../core/index.ts';

export interface ScreenViewState {
  readonly mode: 'normal' | 'eink';
}

export const INITIAL_SCREEN_STATE: ScreenViewState = { mode: 'normal' };

function isObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const screenDefinition: ViewDefinition<ScreenViewState> = {
  typeId: 'screen',
  title: 'Screen',
  icon: 'screen',
  initialState: INITIAL_SCREEN_STATE,
  serialize: (state) => ({ mode: state.mode }),
  deserialize: (json) => (isObject(json) && json.mode === 'eink' ? { mode: 'eink' } : INITIAL_SCREEN_STATE),
};
