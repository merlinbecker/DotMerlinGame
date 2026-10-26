import type { FrameSnapshot, FrameStatePublisher, FrameStateSource, PublishRate } from '../../core/index.ts';

/** Frame state as one slot sees it: throttled by the view's own rate and silent while hidden. */
export interface SlotFrameSource extends FrameStateSource {
  setVisible(visible: boolean): void;
  setRate(rate: PublishRate): void;
  requestSnapshot(): void;
  /** True while this slot wants frames pushed (visible, subscribed, rate not on-demand). */
  readonly wantsFrames: boolean;
  /** The view in this slot reads inspection data (ViewDefinition.inspects, M1b). */
  setInspects(inspects: boolean): void;
  /** True while this slot needs inspection data in snapshots (visible, subscribed, inspecting view). */
  readonly wantsInspection: boolean;
}

export function createSlotFrameSource(upstream: FrameStatePublisher, onDemandChanged: () => void = () => undefined): SlotFrameSource {
  const listeners = new Set<() => void>();
  let visible = true;
  let rate: PublishRate = { kind: 'full' };
  let delivered: FrameSnapshot | null = null;
  let counter = 0;
  let requested = false;
  let inspects = false;
  let unsubscribeUpstream: (() => void) | null = null;

  const deliver = () => {
    delivered = upstream.getSnapshot();
    for (const listener of [...listeners]) listener();
  };

  const onUpstream = () => {
    if (!visible) return;
    // A delivery on request only goes to the slots that asked; it is no frame for the others (rule 7).
    if (upstream.getDeliveryKind() === 'request') {
      if (requested) {
        requested = false;
        deliver();
      }
      return;
    }
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
      if (!visible) return;
      requested = true;
      upstream.requestSnapshot();
    },
    setInspects(next) {
      inspects = next;
      onDemandChanged();
    },
    get wantsInspection() {
      return visible && listeners.size > 0 && inspects;
    },
    get wantsFrames() {
      return visible && listeners.size > 0 && rate.kind !== 'on-demand';
    },
  };
}
