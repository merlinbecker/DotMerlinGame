import { describe, expect, it, vi } from 'vitest';
import { createDomainEventBus } from '../../src/core/events/domain-event-bus.ts';

describe('domain event bus', () => {
  it('delivers only events of the subscribed type', () => {
    const bus = createDomainEventBus();
    const loaded = vi.fn();
    const halted = vi.fn();
    bus.subscribe('RomLoaded', loaded);
    bus.subscribe('EmulatorHalted', halted);
    bus.publish({ type: 'RomLoaded', romId: 'abc', title: 'T' });
    expect(loaded).toHaveBeenCalledWith({ type: 'RomLoaded', romId: 'abc', title: 'T' });
    expect(halted).not.toHaveBeenCalled();
  });

  it('stops delivering after unsubscribe', () => {
    const bus = createDomainEventBus();
    const handler = vi.fn();
    const unsubscribe = bus.subscribe('RunStateChanged', handler);
    unsubscribe();
    bus.publish({ type: 'RunStateChanged', runState: 'paused' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps delivering to other handlers when one unsubscribes during publish', () => {
    const bus = createDomainEventBus();
    const second = vi.fn();
    const unsubscribe = bus.subscribe('RunStateChanged', () => {
      unsubscribe();
    });
    bus.subscribe('RunStateChanged', second);
    bus.publish({ type: 'RunStateChanged', runState: 'running' });
    expect(second).toHaveBeenCalledTimes(1);
  });
});
