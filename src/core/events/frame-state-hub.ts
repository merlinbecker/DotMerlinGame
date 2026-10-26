import type { DeliveryKind, FrameSnapshot, FrameStatePublisher, PublishRate } from './frame-state.ts';

/** Builds a snapshot of the current state; includes inspection data only when asked to. */
export type SnapshotBuilder = (withInspection: boolean) => FrameSnapshot;

export interface FrameStateHub extends FrameStatePublisher {
  /**
   * Offers an emulated frame. `build` is only called when the frame is actually delivered, so no
   * snapshot is copied out of the emulator while nobody looks.
   */
  offer(frame: number, build: SnapshotBuilder): void;
  /** Remembers the current state without delivering it (after load, reset, halt), so a request can show it. */
  prime(build: SnapshotBuilder): void;
  readonly hasSubscribers: boolean;
}

/** Channel 1: frame state with configurable publish rate (ADR-0008); emulation speed never depends on it. */
export function createFrameStateHub(): FrameStateHub {
  const listeners = new Set<() => void>();
  let rate: PublishRate = { kind: 'full' };
  let snapshot: FrameSnapshot | null = null;
  let latest: SnapshotBuilder | null = null;
  let offered = 0;
  let inspectionDemand = false;
  let deliveryKind: DeliveryKind = 'frame';
  let requestPending = false;

  const deliver = (build: SnapshotBuilder, kind: DeliveryKind) => {
    snapshot = build(inspectionDemand);
    deliveryKind = kind;
    try {
      for (const listener of [...listeners]) listener();
    } finally {
      deliveryKind = 'frame';
    }
  };

  // All requests of one task share a single build (contracts/frame-state.md rule 6).
  const flushRequest = () => {
    if (!requestPending) return;
    requestPending = false;
    if (latest && listeners.size > 0) deliver(latest, 'request');
  };

  return {
    subscribe(onChange) {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    getSnapshot: () => snapshot,
    setPublishRate(next) {
      if (next.kind === 'reduced' && !(Number.isInteger(next.everyNthFrame) && next.everyNthFrame >= 2)) {
        throw new Error('A reduced publish rate needs an integer everyNthFrame >= 2');
      }
      rate = next;
      offered = 0;
    },
    getPublishRate: () => rate,
    requestSnapshot() {
      if (requestPending) return;
      requestPending = true;
      queueMicrotask(flushRequest);
    },
    setInspectionDemand(active) {
      inspectionDemand = active;
    },
    getDeliveryKind: () => deliveryKind,
    prime(build) {
      latest = build;
    },
    offer(_frame, build) {
      latest = build;
      if (listeners.size === 0) return;
      offered++;
      if (rate.kind === 'full' || (rate.kind === 'reduced' && offered % rate.everyNthFrame === 0)) {
        requestPending = false;
        deliver(build, 'frame');
      }
    },
    get hasSubscribers() {
      return listeners.size > 0;
    },
  };
}
