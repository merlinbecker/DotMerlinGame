import type { JsonValue, ViewDefinition } from '../../core/index.ts';
import { HEX_AREAS, type HexArea } from '../../core/inspect/areas.ts';
import { inspectHeaderActions } from '../inspect-common/header.ts';
import { INITIAL_RATE, parseRate, type InspectRate } from '../inspect-common/rate.ts';

export interface HexViewState {
  readonly area: HexArea;
  readonly romBank: number;
  readonly ramBank: number;
  /** First address shown; clamped into the area and rounded down to the row width when shown (FR-005). */
  readonly topAddress: number;
  readonly rate: InspectRate;
  /** Highlighted address only; tapping never changes memory (US1-AS6). */
  readonly selected: number | null;
}

export const INITIAL_HEX_STATE: HexViewState = { area: 'wram', romBank: 0, ramBank: 0, topAddress: 0xc000, rate: INITIAL_RATE, selected: null };

function isObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isIndex = (value: JsonValue | undefined, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;

export const hexDefinition: ViewDefinition<HexViewState> = {
  typeId: 'hex',
  title: 'Hex',
  icon: 'hex',
  inspects: true,
  initialState: INITIAL_HEX_STATE,
  serialize: (state) => ({ ...state }),
  deserialize: (json) => {
    if (!isObject(json)) return INITIAL_HEX_STATE;
    const area = HEX_AREAS.find((a) => a.id === json.area)?.id ?? INITIAL_HEX_STATE.area;
    return {
      area,
      romBank: isIndex(json.romBank, 0x1ff) ? json.romBank : 0,
      ramBank: isIndex(json.ramBank, 0x0f) ? json.ramBank : 0,
      topAddress: isIndex(json.topAddress, 0xffff) ? json.topAddress : INITIAL_HEX_STATE.topAddress,
      rate: parseRate(json.rate),
      selected: isIndex(json.selected, 0xffff) ? json.selected : null,
    };
  },
  headerActions: inspectHeaderActions,
};
