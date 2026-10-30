import { createContext } from 'react';
import { createDomainEventBus } from '../core/events/domain-event-bus.ts';
import { createFrameStateHub } from '../core/events/frame-state-hub.ts';
import { IDLE_PROJECT_STATE } from '../core/project/model.ts';
import type {
  DomainEventSubscriber,
  FrameStatePublisher,
  ProjectStateSource,
  SessionState,
  SessionStateSource,
  ViewAction,
} from '../core/index.ts';

/** Everything the grid hands to views; created once in main.tsx. */
export interface AppServices {
  readonly frameState: FrameStatePublisher;
  readonly events: DomainEventSubscriber;
  readonly project: ProjectStateSource;
  readonly session: SessionStateSource;
  /** Session-level actions; SetFrameRate never reaches this, the slot handles it. */
  dispatch(action: ViewAction): void;
}

export const IDLE_SESSION: SessionState = {
  runState: 'empty',
  rom: null,
  fileName: null,
  storedRomAvailable: false,
  settings: { bootMode: 'own-boot-rom', hardwareChecks: false },
  audio: { muted: false, volume: 0.5, unlocked: false },
  notice: null,
  diagnostics: { frameTimeP95Ms: null, frameWorkP95Ms: null, emulatedFps: null, audioUnderflows: 0, audioOverflows: 0 },
  gamepads: [],
};

/** Services without an emulator, for tests and as a fallback. */
export function createIdleServices(): AppServices {
  const noSubscription = () => () => undefined;
  return {
    frameState: createFrameStateHub(),
    events: createDomainEventBus(),
    project: { subscribe: noSubscription, getSnapshot: () => IDLE_PROJECT_STATE },
    session: { subscribe: noSubscription, getSnapshot: () => IDLE_SESSION },
    dispatch: () => undefined,
  };
}

export const ServicesContext = createContext<AppServices>(createIdleServices());
