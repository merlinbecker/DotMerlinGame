import type { JsonValue, ViewDefinition } from '../../core/index.ts';
import { inspectHeaderActions } from '../inspect-common/header.ts';
import { INITIAL_RATE, parseRate, type InspectRate } from '../inspect-common/rate.ts';

export interface SpritesViewState {
  readonly rate: InspectRate;
  /** Raw color indices or through the entry's OBP0/OBP1 (Clarification Q5). */
  readonly palette: 'raw' | 'obp';
  readonly page: number;
}

export const INITIAL_SPRITES_STATE: SpritesViewState = { rate: INITIAL_RATE, palette: 'raw', page: 0 };

function isObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const spritesDefinition: ViewDefinition<SpritesViewState> = {
  typeId: 'sprites',
  title: 'Sprites',
  icon: 'sprites',
  inspects: true,
  initialState: INITIAL_SPRITES_STATE,
  serialize: (state) => ({ ...state }),
  deserialize: (json) => {
    if (!isObject(json)) return INITIAL_SPRITES_STATE;
    const page = json.page;
    return {
      rate: parseRate(json.rate),
      palette: json.palette === 'obp' ? 'obp' : 'raw',
      page: typeof page === 'number' && Number.isInteger(page) && page >= 0 && page < 40 ? page : 0,
    };
  },
  headerActions: inspectHeaderActions,
};
