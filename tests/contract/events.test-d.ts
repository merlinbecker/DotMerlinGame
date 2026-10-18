import { useSyncExternalStore } from 'react';
import { describe, expectTypeOf, it } from 'vitest';
import type {
  DomainEvent,
  DomainEventBus,
  EventOf,
  FrameSnapshot,
  FrameStateSource,
  PublishRate,
} from '../../src/core/index.ts';

declare const bus: DomainEventBus;
declare const source: FrameStateSource;

describe('domain events', () => {
  it('rejects events with an unknown type', () => {
    // @ts-expect-error 'Unknown' is not part of the DomainEvent union
    bus.publish({ type: 'Unknown' });
  });

  it('rejects known types with missing fields', () => {
    // @ts-expect-error BreakpointHit needs address and bank
    bus.publish({ type: 'BreakpointHit' });
  });

  it('narrows the handler to the subscribed event', () => {
    bus.subscribe('BreakpointHit', (event) => {
      expectTypeOf(event).toEqualTypeOf<EventOf<'BreakpointHit'>>();
      expectTypeOf(event.address).toBeNumber();
    });
  });

  it('only knows the four M0 event types', () => {
    expectTypeOf<DomainEvent['type']>().toEqualTypeOf<
      'RomLoaded' | 'BuildFinished' | 'BreakpointHit' | 'ProjectChanged'
    >();
  });
});

describe('frame state', () => {
  it('allows exactly three publish rates', () => {
    expectTypeOf<PublishRate['kind']>().toEqualTypeOf<'full' | 'reduced' | 'on-demand'>();
    const reduced: PublishRate = { kind: 'reduced', everyNthFrame: 2 };
    expectTypeOf(reduced).toExtend<PublishRate>();
    // @ts-expect-error reduced rate needs everyNthFrame
    expectTypeOf({ kind: 'reduced' } as const).toExtend<PublishRate>();
  });

  it('fits React useSyncExternalStore', () => {
    const snapshot = useSyncExternalStore(
      (onChange) => source.subscribe(onChange),
      () => source.getSnapshot(),
    );
    expectTypeOf(snapshot).toEqualTypeOf<FrameSnapshot | null>();
  });
});
