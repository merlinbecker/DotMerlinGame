# Vertrag: Eventkanäle

Ort: `src/core/events/`. Interfaces in M0, Umsetzung in M1.

## Kanal 1 – Frame-Zustand (`frame-state.ts`)

```ts
export type PublishRate =
  | { readonly kind: 'full' }
  | { readonly kind: 'reduced'; readonly everyNthFrame: number }
  | { readonly kind: 'on-demand' };

export interface FrameStateSource {
  /** Signatur passend zu React useSyncExternalStore. */
  subscribe(onChange: () => void): Unsubscribe;
  getSnapshot(): FrameSnapshot | null;
}

export interface FrameStatePublisher extends FrameStateSource {
  setPublishRate(rate: PublishRate): void;
  getPublishRate(): PublishRate;
  /** Bei 'on-demand': genau einen aktuellen Snapshot veröffentlichen. */
  requestSnapshot(): void;
}
```

`FrameSnapshot`: siehe [data-model.md](../data-model.md).

## Kanal 2 – Diskrete Ereignisse (`domain-events.ts`)

```ts
export type DomainEvent =
  | { readonly type: 'RomLoaded'; readonly romId: string; readonly title: string }
  | { readonly type: 'BuildFinished'; readonly success: boolean; readonly errorCount: number; readonly warningCount: number }
  | { readonly type: 'BreakpointHit'; readonly address: number; readonly bank: number }
  | { readonly type: 'ProjectChanged'; readonly projectId: string };

export type DomainEventType = DomainEvent['type'];
export type EventOf<T extends DomainEventType> = Extract<DomainEvent, { type: T }>;

export interface DomainEventSubscriber {
  subscribe<T extends DomainEventType>(type: T, handler: (event: EventOf<T>) => void): Unsubscribe;
}

export interface DomainEventBus extends DomainEventSubscriber {
  publish(event: DomainEvent): void;
}
```

## Zusicherungen (Typ-Tests)

1. `publish({ type: 'Unknown' })` ist ein Typfehler (`@ts-expect-error`).
2. Ein Handler für `'BreakpointHit'` erhält genau `EventOf<'BreakpointHit'>`.
3. `PublishRate` erlaubt genau die drei Varianten.
4. `FrameStateSource` passt zur Signatur von `useSyncExternalStore`.
