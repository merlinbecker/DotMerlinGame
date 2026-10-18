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

  it('knows the M0 and M1 event types and nothing else', () => {
    expectTypeOf<DomainEvent['type']>().toEqualTypeOf<
      | 'RomLoaded'
      | 'RomRejected'
      | 'EmulatorHalted'
      | 'RunStateChanged'
      | 'StorageFailed'
      | 'BuildFinished'
      | 'BreakpointHit'
      | 'ProjectChanged'
    >();
  });

  it('types the M1 event fields exactly', () => {
    expectTypeOf<EventOf<'RomRejected'>['reason']>().toEqualTypeOf<'invalid' | 'cgb-only' | 'unsupported-cartridge'>();
    expectTypeOf<EventOf<'EmulatorHalted'>['reason']>().toEqualTypeOf<'header-logo' | 'header-checksum'>();
    expectTypeOf<EventOf<'RunStateChanged'>['runState']>().toEqualTypeOf<'empty' | 'running' | 'paused' | 'halted'>();
    expectTypeOf<EventOf<'StorageFailed'>['operation']>().toEqualTypeOf<'save-rom' | 'save-battery'>();
    // @ts-expect-error a halt always names its reason
    bus.publish({ type: 'EmulatorHalted' });
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

  it('carries the screen as shade indices', () => {
    expectTypeOf<FrameSnapshot['screen']>().toEqualTypeOf<Uint8Array>();
  });

  it('fits React useSyncExternalStore', () => {
    const snapshot = useSyncExternalStore(
      (onChange) => source.subscribe(onChange),
      () => source.getSnapshot(),
    );
    expectTypeOf(snapshot).toEqualTypeOf<FrameSnapshot | null>();
  });
});
