import type { RomRejectReason } from '../rom/header.ts';
import type { Unsubscribe } from '../types.ts';

export type RunState = 'empty' | 'running' | 'paused' | 'halted';

/** Why hardware-near mode stopped the system at the hand-off to $0100 (ADR-0004). */
export type HaltReason = 'header-logo' | 'header-checksum';

/** Rare, discrete events (channel 2). New events only by extending this union, never by free strings. */
export type DomainEvent =
  | { readonly type: 'RomLoaded'; readonly romId: string; readonly title: string }
  | { readonly type: 'RomRejected'; readonly reason: RomRejectReason }
  | { readonly type: 'EmulatorHalted'; readonly reason: HaltReason }
  | { readonly type: 'RunStateChanged'; readonly runState: RunState }
  | { readonly type: 'StorageFailed'; readonly operation: 'save-rom' | 'save-battery' | 'save-project' }
  | {
      readonly type: 'BuildFinished';
      readonly success: boolean;
      readonly errorCount: number;
      readonly warningCount: number;
    }
  | { readonly type: 'BreakpointHit'; readonly address: number; readonly bank: number }
  | { readonly type: 'ProjectChanged'; readonly projectId: string }
  /** After a reset of the session, also while running (M1b: views refresh at once). */
  | { readonly type: 'EmulatorReset' };

export type DomainEventType = DomainEvent['type'];

export type EventOf<T extends DomainEventType> = Extract<DomainEvent, { readonly type: T }>;

export interface DomainEventSubscriber {
  subscribe<T extends DomainEventType>(type: T, handler: (event: EventOf<T>) => void): Unsubscribe;
}

export interface DomainEventBus extends DomainEventSubscriber {
  publish(event: DomainEvent): void;
}
