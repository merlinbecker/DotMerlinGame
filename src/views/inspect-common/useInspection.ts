import { useEffect, useSyncExternalStore } from 'react';
import type { ViewContext } from '../../core/index.ts';
import { toPublishRate, type InspectRate } from './rate.ts';

/**
 * Frame state and session for a memory view (contracts/view-contract.md, duties 2 and 3): sets the slot's
 * rate and asks for one current snapshot when mounted, when visible again, and when the emulator pauses,
 * halts, loads or resets, so the view never shows an outdated state (FR-010).
 */
export function useInspection(context: ViewContext, rate: InspectRate) {
  const snapshot = useSyncExternalStore(
    (onChange) => context.frameState.subscribe(onChange),
    () => context.frameState.getSnapshot(),
  );
  const session = useSyncExternalStore(
    (onChange) => context.session.subscribe(onChange),
    () => context.session.getSnapshot(),
  );

  useEffect(() => {
    context.dispatch({ type: 'SetFrameRate', rate: toPublishRate(rate) });
  }, [context, rate]);

  useEffect(() => {
    if (!context.visible) return;
    const request = () => {
      context.dispatch({ type: 'RequestSnapshot' });
    };
    request();
    const subscriptions = [
      context.events.subscribe('RunStateChanged', (event) => {
        if (event.runState !== 'running') request();
      }),
      context.events.subscribe('RomLoaded', request),
      context.events.subscribe('EmulatorReset', request),
      context.events.subscribe('EmulatorHalted', request),
    ];
    return () => {
      for (const unsubscribe of subscriptions) unsubscribe();
    };
  }, [context]);

  return { snapshot, inspection: snapshot?.inspection ?? null, session };
}
