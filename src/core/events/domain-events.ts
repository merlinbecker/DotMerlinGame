import type { Unsubscribe } from '../types.ts';

/** Rare, discrete events (channel 2). New events only by extending this union, never by free strings. */
export type DomainEvent =
  | { readonly type: 'RomLoaded'; readonly romId: string; readonly title: string }
  | {
      readonly type: 'BuildFinished';
      readonly success: boolean;
      readonly errorCount: number;
      readonly warningCount: number;
    }
  | { readonly type: 'BreakpointHit'; readonly address: number; readonly bank: number }
  | { readonly type: 'ProjectChanged'; readonly projectId: string };

export type DomainEventType = DomainEvent['type'];

export type EventOf<T extends DomainEventType> = Extract<DomainEvent, { readonly type: T }>;

export interface DomainEventSubscriber {
  subscribe<T extends DomainEventType>(type: T, handler: (event: EventOf<T>) => void): Unsubscribe;
}

export interface DomainEventBus extends DomainEventSubscriber {
  publish(event: DomainEvent): void;
}
