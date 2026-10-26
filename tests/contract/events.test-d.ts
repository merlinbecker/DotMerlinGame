import { useSyncExternalStore } from 'react';
import { describe, expectTypeOf, it } from 'vitest';
import type {
  CartRamSnapshot,
  DomainEvent,
  DomainEventBus,
  EventOf,
  FrameSnapshot,
  FrameStateSource,
  InspectionSnapshot,
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

  it('carries inspection data as a read-only, nullable field (M1b)', () => {
    expectTypeOf<FrameSnapshot['inspection']>().toEqualTypeOf<InspectionSnapshot | null>();
    expectTypeOf<InspectionSnapshot['cartRam']>().toEqualTypeOf<CartRamSnapshot | null>();
    expectTypeOf<InspectionSnapshot['cpu']>().toEqualTypeOf<{ readonly ime: boolean; readonly halted: boolean }>();
    const inspection = {} as InspectionSnapshot;
    // @ts-expect-error inspection fields are read-only
    inspection.romBank = 1;
    // @ts-expect-error a snapshot without the inspection field does not compile
    const missing: FrameSnapshot = { frame: 0, cycles: 0, registers: {} as FrameSnapshot['registers'], flags: {} as FrameSnapshot['flags'], changedMemory: [], screen: new Uint8Array() };
    expectTypeOf(missing).toEqualTypeOf<FrameSnapshot>();
  });

  it('fits React useSyncExternalStore', () => {
    const snapshot = useSyncExternalStore(
      (onChange) => source.subscribe(onChange),
      () => source.getSnapshot(),
    );
    expectTypeOf(snapshot).toEqualTypeOf<FrameSnapshot | null>();
  });
});
