import type { FrameStatePublisher } from '../../core/index.ts';
import type { SlotFrameSource } from './slot-frame-source.ts';

/**
 * Sets the emulator's publish rate from what the slots need: full while any visible slot wants frames,
 * otherwise on-demand. Throttling per view happens in the slot sources (FR-022), never in the emulator.
 */
export function createFrameDemand(publisher: FrameStatePublisher) {
  const sources = new Set<SlotFrameSource>();

  const changed = () => {
    const wanted = [...sources].some((source) => source.wantsFrames);
    const current = publisher.getPublishRate().kind;
    if (wanted && current !== 'full') publisher.setPublishRate({ kind: 'full' });
    if (!wanted && current !== 'on-demand') publisher.setPublishRate({ kind: 'on-demand' });
  };

  return {
    changed,
    register(source: SlotFrameSource) {
      sources.add(source);
      changed();
      return () => {
        sources.delete(source);
        changed();
      };
    },
  };
}
