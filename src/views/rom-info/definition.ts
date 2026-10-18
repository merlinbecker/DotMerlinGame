import type { JsonValue, ViewDefinition } from '../../core/index.ts';

/** Pages instead of scrolling (Constitution V); each fits a minimum-size slot. */
export const ROM_INFO_PAGES = ['rom', 'start', 'sound', 'header'] as const;
export type RomInfoPage = (typeof ROM_INFO_PAGES)[number];

export interface RomInfoState {
  readonly page: RomInfoPage;
}

function isObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const romInfoDefinition: ViewDefinition<RomInfoState> = {
  typeId: 'rom-info',
  title: 'ROM Info',
  icon: 'rom',
  initialState: { page: 'rom' },
  serialize: (state) => ({ page: state.page }),
  deserialize: (json) => {
    const page = isObject(json) ? json.page : undefined;
    return { page: ROM_INFO_PAGES.find((p) => p === page) ?? 'rom' };
  },
};
