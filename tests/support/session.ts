import type { SessionState, SessionStateSource } from '../../src/core/index.ts';

export const EMPTY_SESSION: SessionState = {
  runState: 'empty',
  rom: null,
  fileName: null,
  storedRomAvailable: false,
  settings: { bootMode: 'own-boot-rom', hardwareChecks: false },
  audio: { muted: false, volume: 0.5, unlocked: false },
  notice: null,
};

/** A static session source for view tests. */
export function staticSession(state: Partial<SessionState> = {}): SessionStateSource {
  const snapshot = { ...EMPTY_SESSION, ...state };
  return { subscribe: () => () => undefined, getSnapshot: () => snapshot };
}
