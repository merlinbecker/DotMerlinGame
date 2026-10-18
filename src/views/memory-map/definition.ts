import type { JsonValue, ViewDefinition } from '../../core/index.ts';

export interface MemoryMapState {
  readonly page: number;
}

function isObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const memoryMapDefinition: ViewDefinition<MemoryMapState> = {
  typeId: 'memory-map',
  title: 'Memory Map',
  icon: 'memory',
  initialState: { page: 0 },
  serialize: (state) => ({ page: state.page }),
  deserialize: (json: JsonValue) => {
    const page = isObject(json) ? json.page : undefined;
    return { page: typeof page === 'number' && Number.isInteger(page) && page >= 0 ? page : 0 };
  },
};
