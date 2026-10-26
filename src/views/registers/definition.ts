import type { JsonValue, ViewDefinition } from '../../core/index.ts';
import { inspectHeaderActions } from '../inspect-common/header.ts';
import { INITIAL_RATE, parseRate, type InspectRate } from '../inspect-common/rate.ts';

export interface RegistersViewState {
  readonly rate: InspectRate;
}

function isObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const registersDefinition: ViewDefinition<RegistersViewState> = {
  typeId: 'registers',
  title: 'Registers',
  icon: 'registers',
  inspects: true,
  initialState: { rate: INITIAL_RATE },
  serialize: (state) => ({ rate: state.rate }),
  deserialize: (json) => ({ rate: parseRate(isObject(json) ? json.rate : undefined) }),
  headerActions: inspectHeaderActions,
};
