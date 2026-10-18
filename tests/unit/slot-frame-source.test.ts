import { describe, expect, it, vi } from 'vitest';
import type { FrameSnapshot } from '../../src/core/index.ts';
import { createFrameStateHub } from '../../src/core/events/frame-state-hub.ts';
import { createFrameDemand } from '../../src/app/layout/frame-demand.ts';
import { createSlotFrameSource } from '../../src/app/layout/slot-frame-source.ts';

function snapshot(frame: number): FrameSnapshot {
  return {
    frame,
    cycles: 0,
    registers: { a: 0, f: 0, b: 0, c: 0, d: 0, e: 0, h: 0, l: 0, sp: 0, pc: 0 },
    flags: { z: false, n: false, h: false, c: false },
    changedMemory: [],
    screen: new Uint8Array(160 * 144),
  };
}

function frames(hub: ReturnType<typeof createFrameStateHub>, from: number, count: number) {
  for (let frame = from; frame < from + count; frame++) hub.offer(frame, () => snapshot(frame));
}

describe('slot frame source', () => {
  it('processes no update while the slot is not visible (SC-006)', () => {
    const hub = createFrameStateHub();
    const slot = createSlotFrameSource(hub);
    const listener = vi.fn();
    slot.subscribe(listener);
    slot.setVisible(false);
    frames(hub, 1, 10);
    expect(listener).toHaveBeenCalledTimes(0);
    expect(slot.getSnapshot()).toBeNull();
  });

  it('keeps the last delivered snapshot while hidden', () => {
    const hub = createFrameStateHub();
    const slot = createSlotFrameSource(hub);
    slot.subscribe(() => undefined);
    frames(hub, 1, 2);
    slot.setVisible(false);
    frames(hub, 3, 5);
    expect(slot.getSnapshot()?.frame).toBe(2);
  });

  it('delivers every n-th frame at a reduced rate', () => {
    const hub = createFrameStateHub();
    const slot = createSlotFrameSource(hub);
    const listener = vi.fn();
    slot.subscribe(listener);
    slot.setRate({ kind: 'reduced', everyNthFrame: 4 });
    frames(hub, 1, 12);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(slot.getSnapshot()?.frame).toBe(12);
  });

  it('delivers on demand only after a request', () => {
    const hub = createFrameStateHub();
    const slot = createSlotFrameSource(hub);
    const listener = vi.fn();
    slot.subscribe(listener);
    slot.setRate({ kind: 'on-demand' });
    frames(hub, 1, 3);
    expect(listener).not.toHaveBeenCalled();
    slot.requestSnapshot();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('frame demand', () => {
  it('runs the emulator publisher at full rate only while a visible slot subscribes', () => {
    const hub = createFrameStateHub();
    const demand = createFrameDemand(hub);
    const a = createSlotFrameSource(hub, demand.changed);
    const b = createSlotFrameSource(hub, demand.changed);
    demand.register(a);
    demand.register(b);
    expect(hub.getPublishRate()).toEqual({ kind: 'on-demand' });

    const unsubscribe = a.subscribe(() => undefined);
    expect(hub.getPublishRate()).toEqual({ kind: 'full' });

    a.setVisible(false);
    expect(hub.getPublishRate()).toEqual({ kind: 'on-demand' });

    b.subscribe(() => undefined);
    b.setRate({ kind: 'reduced', everyNthFrame: 15 });
    expect(hub.getPublishRate()).toEqual({ kind: 'full' });

    b.setRate({ kind: 'on-demand' });
    unsubscribe();
    expect(hub.getPublishRate()).toEqual({ kind: 'on-demand' });
  });
});
