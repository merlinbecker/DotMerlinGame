import type { FrameSnapshot, FrameStatePublisher, PublishRate } from './frame-state.ts';

export interface FrameStateHub extends FrameStatePublisher {
  /**
   * Offers an emulated frame. `build` is only called when the frame is actually delivered, so no
   * snapshot is copied out of the emulator while nobody looks.
   */
  offer(frame: number, build: () => FrameSnapshot): void;
  readonly hasSubscribers: boolean;
}

/** Channel 1: frame state with configurable publish rate (ADR-0008); emulation speed never depends on it. */
export function createFrameStateHub(): FrameStateHub {
  const listeners = new Set<() => void>();
  let rate: PublishRate = { kind: 'full' };
  let snapshot: FrameSnapshot | null = null;
  let latest: (() => FrameSnapshot) | null = null;
  let offered = 0;

  const deliver = (build: () => FrameSnapshot) => {
    snapshot = build();
    for (const listener of [...listeners]) listener();
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
      if (latest && listeners.size > 0) deliver(latest);
    },
    offer(_frame, build) {
      latest = build;
      if (listeners.size === 0) return;
      offered++;
      if (rate.kind === 'full' || (rate.kind === 'reduced' && offered % rate.everyNthFrame === 0)) deliver(build);
    },
    get hasSubscribers() {
      return listeners.size > 0;
    },
  };
}
