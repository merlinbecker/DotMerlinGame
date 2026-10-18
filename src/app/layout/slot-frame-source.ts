import type { FrameSnapshot, FrameStatePublisher, FrameStateSource, PublishRate } from '../../core/index.ts';

/** Frame state as one slot sees it: throttled by the view's own rate and silent while hidden. */
export interface SlotFrameSource extends FrameStateSource {
  setVisible(visible: boolean): void;
  setRate(rate: PublishRate): void;
  requestSnapshot(): void;
  /** True while this slot wants frames pushed (visible, subscribed, rate not on-demand). */
  readonly wantsFrames: boolean;
}

export function createSlotFrameSource(upstream: FrameStatePublisher, onDemandChanged: () => void = () => undefined): SlotFrameSource {
  const listeners = new Set<() => void>();
  let visible = true;
  let rate: PublishRate = { kind: 'full' };
  let delivered: FrameSnapshot | null = null;
  let counter = 0;
  let requested = false;
  let unsubscribeUpstream: (() => void) | null = null;

  const deliver = () => {
    delivered = upstream.getSnapshot();
    for (const listener of [...listeners]) listener();
  };

  const onUpstream = () => {
    if (!visible) return;
    if (requested) {
      requested = false;
      deliver();
      return;
    }
    if (rate.kind === 'on-demand') return;
    counter++;
    if (rate.kind === 'full' || counter % rate.everyNthFrame === 0) deliver();
  };

  const sync = () => {
    const needed = listeners.size > 0;
    if (needed && !unsubscribeUpstream) unsubscribeUpstream = upstream.subscribe(onUpstream);
    if (!needed && unsubscribeUpstream) {
      unsubscribeUpstream();
      unsubscribeUpstream = null;
    }
    onDemandChanged();
  };

  return {
    subscribe(onChange) {
      listeners.add(onChange);
      sync();
      return () => {
        listeners.delete(onChange);
        sync();
      };
    },
    getSnapshot: () => delivered,
    setVisible(next) {
      visible = next;
      onDemandChanged();
    },
    setRate(next) {
      rate = next;
      counter = 0;
      onDemandChanged();
    },
    requestSnapshot() {
      requested = true;
      upstream.requestSnapshot();
    },
    get wantsFrames() {
      return visible && listeners.size > 0 && rate.kind !== 'on-demand';
    },
  };
}
