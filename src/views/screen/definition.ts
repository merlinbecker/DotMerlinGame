import type { JsonValue, ViewDefinition } from '../../core/index.ts';

/** Allowed e-ink refresh divisors: every n-th emulated frame is drawn (≈ 15, 10, 4 or 2 pictures/s). */
export const EINK_RATES = [4, 6, 15, 30] as const;
export type EinkRate = (typeof EINK_RATES)[number];

export interface ScreenViewState {
  readonly mode: 'normal' | 'eink';
  readonly einkEveryNthFrame: EinkRate;
  readonly einkMapping: 'contrast' | 'linear';
  readonly einkDither: boolean;
}

/** Normal mode by default; e-ink is a switch remembered per device (US5-AS4, decision of the project owner). */
export const INITIAL_SCREEN_STATE: ScreenViewState = { mode: 'normal', einkEveryNthFrame: 15, einkMapping: 'contrast', einkDither: false };

function isObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRate(value: JsonValue | undefined): value is EinkRate {
  return EINK_RATES.some((rate) => rate === value);
}

export const screenDefinition: ViewDefinition<ScreenViewState> = {
  typeId: 'screen',
  title: 'Screen',
  icon: 'screen',
  initialState: INITIAL_SCREEN_STATE,
  serialize: (state) => ({ ...state }),
  deserialize: (json) => {
    if (!isObject(json)) return INITIAL_SCREEN_STATE;
    return {
      mode: json.mode === 'eink' ? 'eink' : 'normal',
      einkEveryNthFrame: isRate(json.einkEveryNthFrame) ? json.einkEveryNthFrame : INITIAL_SCREEN_STATE.einkEveryNthFrame,
      einkMapping: json.einkMapping === 'linear' ? 'linear' : 'contrast',
      einkDither: json.einkDither === true,
    };
  },
  // Mute sits in the screen header so it is at hand while playing (FR-027).
  headerActions: (session) => [
    { id: 'mute', label: session.audio.muted ? 'Unmute' : 'Mute', pressed: session.audio.muted, action: { type: 'SetMuted', muted: !session.audio.muted } },
  ],
};
