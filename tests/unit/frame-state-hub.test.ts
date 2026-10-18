import { describe, expect, it, vi } from 'vitest';
import type { FrameSnapshot } from '../../src/core/index.ts';
import { createFrameStateHub } from '../../src/core/events/frame-state-hub.ts';

function snapshot(frame: number): FrameSnapshot {
  return {
    frame,
    cycles: frame * 70224,
    registers: { a: 0, f: 0, b: 0, c: 0, d: 0, e: 0, h: 0, l: 0, sp: 0, pc: 0 },
    flags: { z: false, n: false, h: false, c: false },
    changedMemory: [],
    screen: new Uint8Array(160 * 144),
  };
}

function offerFrames(hub: ReturnType<typeof createFrameStateHub>, count: number, build = vi.fn(snapshot)) {
  for (let frame = 1; frame <= count; frame++) hub.offer(frame, () => build(frame));
  return build;
}

describe('frame state hub', () => {
  it('delivers every frame at full rate and keeps the last snapshot', () => {
    const hub = createFrameStateHub();
    const listener = vi.fn();
    hub.subscribe(listener);
    offerFrames(hub, 3);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(hub.getSnapshot()?.frame).toBe(3);
  });

  it('delivers every n-th frame at a reduced rate', () => {
    const hub = createFrameStateHub();
    const listener = vi.fn();
    hub.subscribe(listener);
    hub.setPublishRate({ kind: 'reduced', everyNthFrame: 3 });
    const build = offerFrames(hub, 9);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(build).toHaveBeenCalledTimes(3);
  });

  it('rejects a reduced rate below 2', () => {
    const hub = createFrameStateHub();
    expect(() => {
      hub.setPublishRate({ kind: 'reduced', everyNthFrame: 1 });
    }).toThrow();
  });

  it('delivers on demand only after requestSnapshot', () => {
    const hub = createFrameStateHub();
    const listener = vi.fn();
    hub.subscribe(listener);
    hub.setPublishRate({ kind: 'on-demand' });
    offerFrames(hub, 5);
    expect(listener).not.toHaveBeenCalled();
    hub.requestSnapshot();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(hub.getSnapshot()?.frame).toBe(5);
  });

  it('builds no snapshot while nobody subscribes', () => {
    const hub = createFrameStateHub();
    const build = offerFrames(hub, 4);
    expect(build).not.toHaveBeenCalled();
    expect(hub.hasSubscribers).toBe(false);
  });

  it('reports the current rate', () => {
    const hub = createFrameStateHub();
    expect(hub.getPublishRate()).toEqual({ kind: 'full' });
    hub.setPublishRate({ kind: 'on-demand' });
    expect(hub.getPublishRate()).toEqual({ kind: 'on-demand' });
  });
});
