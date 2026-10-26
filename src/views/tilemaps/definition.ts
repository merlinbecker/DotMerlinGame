import type { JsonValue, ViewDefinition } from '../../core/index.ts';
import type { MapKind } from '../../core/inspect/tilemap.ts';
import { inspectHeaderActions } from '../inspect-common/header.ts';
import { INITIAL_RATE, parseRate, type InspectRate } from '../inspect-common/rate.ts';

export interface TilemapsViewState {
  readonly rate: InspectRate;
  readonly palette: 'raw' | 'bgp';
  readonly map: MapKind;
  /** Tapped map entry 0–1023. */
  readonly selected: number | null;
}

export const INITIAL_TILEMAPS_STATE: TilemapsViewState = { rate: INITIAL_RATE, palette: 'raw', map: 'background', selected: null };

function isObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const tilemapsDefinition: ViewDefinition<TilemapsViewState> = {
  typeId: 'tilemaps',
  title: 'Tilemaps',
  icon: 'tilemaps',
  inspects: true,
  initialState: INITIAL_TILEMAPS_STATE,
  serialize: (state) => ({ ...state }),
  deserialize: (json) => {
    if (!isObject(json)) return INITIAL_TILEMAPS_STATE;
    const selected = json.selected;
    return {
      rate: parseRate(json.rate),
      palette: json.palette === 'bgp' ? 'bgp' : 'raw',
      map: json.map === 'window' ? 'window' : 'background',
      selected: typeof selected === 'number' && Number.isInteger(selected) && selected >= 0 && selected < 1024 ? selected : null,
    };
  },
  headerActions: inspectHeaderActions,
};
