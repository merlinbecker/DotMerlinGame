import { expect } from 'vitest';
import { createDomainEventBus } from '../../src/core/events/domain-event-bus.ts';
import type { DomainEventBus, FrameSnapshot, SessionState, ViewAction, ViewContext } from '../../src/core/index.ts';
import { IDLE_SESSION } from '../../src/app/services.ts';

/**
 * A fake view context for memory view tests: frame state and session can be set by the test, events can
 * be published, every dispatched action is recorded (analysis finding U1: checked at run time).
 */
export function fakeViewContext(options: { visible?: boolean; size?: number; session?: Partial<SessionState> } = {}) {
  const frameListeners = new Set<() => void>();
  const sessionListeners = new Set<() => void>();
  let snapshot: FrameSnapshot | null = null;
  let session: SessionState = { ...IDLE_SESSION, ...options.session };
  const events: DomainEventBus = createDomainEventBus();
  const actions: ViewAction[] = [];
  const size = options.size ?? 320;
  const context: ViewContext = {
    size: { width: size, height: size },
    frameState: {
      subscribe(onChange) {
        frameListeners.add(onChange);
        return () => frameListeners.delete(onChange);
      },
      getSnapshot: () => snapshot,
    },
    events,
    project: { subscribe: () => () => undefined, getSnapshot: () => null },
    session: {
      subscribe(onChange) {
        sessionListeners.add(onChange);
        return () => sessionListeners.delete(onChange);
      },
      getSnapshot: () => session,
    },
    dispatch: (action) => actions.push(action),
    visible: options.visible ?? true,
  };
  return {
    context,
    actions,
    events,
    setSnapshot(next: FrameSnapshot | null) {
      snapshot = next;
      for (const listener of [...frameListeners]) listener();
    },
    setSession(patch: Partial<SessionState>) {
      session = { ...session, ...patch };
      for (const listener of [...sessionListeners]) listener();
    },
  };
}

/** A memory view may only set its rate and ask for snapshots (FR-002). */
export function expectOnlyInspectActions(actions: readonly ViewAction[]): void {
  expect(actions.filter((action) => action.type !== 'SetFrameRate' && action.type !== 'RequestSnapshot')).toEqual([]);
}
