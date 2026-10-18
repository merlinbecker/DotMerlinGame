import type { DomainEvent, DomainEventBus, DomainEventType, EventOf } from './domain-events.ts';

type Handler = (event: DomainEvent) => void;

/** In-memory implementation of channel 2 (typed discrete events, no string bus). */
export function createDomainEventBus(): DomainEventBus {
  const handlers = new Map<DomainEventType, Set<Handler>>();

  return {
    subscribe<T extends DomainEventType>(type: T, handler: (event: EventOf<T>) => void) {
      const set = handlers.get(type) ?? new Set<Handler>();
      handlers.set(type, set);
      const entry = handler as Handler;
      set.add(entry);
      return () => {
        set.delete(entry);
      };
    },
    publish(event) {
      for (const handler of [...(handlers.get(event.type) ?? [])]) handler(event);
    },
  };
}
