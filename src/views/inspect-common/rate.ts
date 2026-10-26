import type { JsonValue, PublishRate } from '../../core/index.ts';

/** Refresh rate of a memory view (FR-010); UI texts "Live", "1/s", "Manual" (data-model.md). */
export type InspectRate = 'live' | 'second' | 'manual';

/** A view placed into a slot starts at one picture per second on every device (Clarification Q2). */
export const INITIAL_RATE: InspectRate = 'second';

export const RATE_LABELS: Record<InspectRate, string> = { live: 'Live', second: '1/s', manual: 'Manual' };

/** Every 6th emulated frame ≈ 10/s, every 60th ≈ 1/s at about 60 frames/s (research.md R7). */
export function toPublishRate(rate: InspectRate): PublishRate {
  switch (rate) {
    case 'live':
      return { kind: 'reduced', everyNthFrame: 6 };
    case 'second':
      return { kind: 'reduced', everyNthFrame: 60 };
    case 'manual':
      return { kind: 'on-demand' };
  }
}

export function parseRate(json: JsonValue | undefined): InspectRate {
  return json === 'live' || json === 'second' || json === 'manual' ? json : INITIAL_RATE;
}
