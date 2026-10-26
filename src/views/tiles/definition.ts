import type { JsonValue, ViewDefinition } from '../../core/index.ts';
import { TILE_COUNT } from '../../core/inspect/tiles.ts';
import { inspectHeaderActions } from '../inspect-common/header.ts';
import { INITIAL_RATE, parseRate, type InspectRate } from '../inspect-common/rate.ts';

export interface TilesViewState {
  readonly rate: InspectRate;
  /** Raw color indices or mapped through BGP (Clarification Q5). */
  readonly palette: 'raw' | 'bgp';
  readonly page: number;
  /** Tapped tile 0–383 for the detail line. */
  readonly selected: number | null;
}

export const INITIAL_TILES_STATE: TilesViewState = { rate: INITIAL_RATE, palette: 'raw', page: 0, selected: null };

function isObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isIndex = (value: JsonValue | undefined, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;

export const tilesDefinition: ViewDefinition<TilesViewState> = {
  typeId: 'tiles',
  title: 'Tiles',
  icon: 'tiles',
  inspects: true,
  initialState: INITIAL_TILES_STATE,
  serialize: (state) => ({ ...state }),
  deserialize: (json) => {
    if (!isObject(json)) return INITIAL_TILES_STATE;
    return {
      rate: parseRate(json.rate),
      palette: json.palette === 'bgp' ? 'bgp' : 'raw',
      page: isIndex(json.page, 2) ? json.page : 0,
      selected: isIndex(json.selected, TILE_COUNT - 1) ? json.selected : null,
    };
  },
  headerActions: inspectHeaderActions,
};
