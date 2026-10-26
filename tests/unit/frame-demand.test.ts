import { describe, expect, it, vi } from 'vitest';
import { createFrameStateHub } from '../../src/core/events/frame-state-hub.ts';
import { createFrameDemand } from '../../src/app/layout/frame-demand.ts';
import { createSlotFrameSource } from '../../src/app/layout/slot-frame-source.ts';

describe('inspection demand (M1b, contracts/view-contract.md)', () => {
  function setup() {
    const hub = createFrameStateHub();
    const setInspectionDemand = vi.spyOn(hub, 'setInspectionDemand');
    const demand = createFrameDemand(hub);
    const screen = createSlotFrameSource(hub, demand.changed);
    const memory = createSlotFrameSource(hub, demand.changed);
    memory.setInspects(true);
    demand.register(screen);
    demand.register(memory);
    const lastDemand = () => setInspectionDemand.mock.calls.at(-1)?.[0] ?? false;
    return { screen, memory, lastDemand };
  }

  it('is off while no inspecting slot subscribes', () => {
    const { screen, lastDemand } = setup();
    screen.subscribe(() => undefined);
    expect(lastDemand()).toBe(false);
  });

  it('is on while a visible inspecting slot subscribes, also at the on-demand rate', () => {
    const { memory, lastDemand } = setup();
    const unsubscribe = memory.subscribe(() => undefined);
    expect(lastDemand()).toBe(true);
    memory.setRate({ kind: 'on-demand' });
    expect(lastDemand()).toBe(true);
    unsubscribe();
    expect(lastDemand()).toBe(false);
  });

  it('follows the visibility of the inspecting slot', () => {
    const { memory, lastDemand } = setup();
    memory.subscribe(() => undefined);
    memory.setVisible(false);
    expect(lastDemand()).toBe(false);
    memory.setVisible(true);
    expect(lastDemand()).toBe(true);
  });
});
