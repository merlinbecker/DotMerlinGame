import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FrameSnapshot, ViewAction, ViewInstanceProps } from '../../src/core/index.ts';
import { createFrameStateHub } from '../../src/core/events/frame-state-hub.ts';
import { createFrameDemand } from '../../src/app/layout/frame-demand.ts';
import { Slot } from '../../src/app/layout/Slot.tsx';
import { createIdleServices, ServicesContext, type AppServices } from '../../src/app/services.ts';
import { defineView, registerViews } from '../../src/app/views/registry.ts';

let renders = 0;
let frameUpdates = 0;

function ProbeView({ context }: ViewInstanceProps<null>) {
  renders++;
  return (
    <div>
      <span data-testid="visible">{String(context.visible)}</span>
      <button type="button" onClick={() => { context.dispatch({ type: 'Pause' }); }}>pause</button>
      <button type="button" onClick={() => { context.dispatch({ type: 'SetFrameRate', rate: { kind: 'on-demand' } }); }}>rate</button>
      <button type="button" onClick={() => { context.dispatch({ type: 'RequestSnapshot' }); }}>request</button>
      <ProbeFrames subscribe={(cb) => context.frameState.subscribe(cb)} />
    </div>
  );
}

function ProbeFrames({ subscribe }: { subscribe: (cb: () => void) => () => void }) {
  useEffect(
    () =>
      subscribe(() => {
        frameUpdates++;
      }),
    [subscribe],
  );
  return null;
}

registerViews([
  defineView<null>(
    {
      typeId: 'probe',
      title: 'Probe',
      icon: 'probe',
      initialState: null,
      serialize: () => null,
      deserialize: () => null,
      headerActions: (session) => [{ id: 'mute', label: session.audio.muted ? 'Unmute' : 'Mute', pressed: session.audio.muted, action: { type: 'SetMuted', muted: !session.audio.muted } }],
    },
    ProbeView,
  ),
]);

function snapshot(frame: number): FrameSnapshot {
  return {
    frame,
    cycles: 0,
    registers: { a: 0, f: 0, b: 0, c: 0, d: 0, e: 0, h: 0, l: 0, sp: 0, pc: 0 },
    flags: { z: false, n: false, h: false, c: false },
    changedMemory: [],
    inspection: null,
    screen: new Uint8Array(160 * 144),
  };
}

function setup(shown: boolean) {
  const hub = createFrameStateHub();
  const dispatched: ViewAction[] = [];
  const services: AppServices = { ...createIdleServices(), frameState: hub, dispatch: (a) => dispatched.push(a) };
  const demand = createFrameDemand(hub);
  render(
    <ServicesContext value={services}>
      <Slot content={{ viewTypeId: 'probe', viewState: null }} shown={shown} visible={shown} size={320} demand={demand} onCycle={vi.fn()} onViewStateChange={vi.fn()} />
    </ServicesContext>,
  );
  return { hub, dispatched };
}

describe('slot renders a registered view with a view context', () => {
  afterEach(cleanup);

  it('forwards session actions and keeps SetFrameRate in the slot', () => {
    const { dispatched } = setup(true);
    fireEvent.click(screen.getByText('pause'));
    fireEvent.click(screen.getByText('rate'));
    expect(dispatched).toEqual([{ type: 'Pause' }]);
  });

  it('answers RequestSnapshot in the slot with one snapshot, never in the session (M1b)', async () => {
    frameUpdates = 0;
    const { hub, dispatched } = setup(true);
    fireEvent.click(screen.getByText('rate'));
    hub.prime(() => snapshot(0));
    fireEvent.click(screen.getByText('request'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(frameUpdates).toBe(1);
    expect(dispatched).toEqual([]);
  });

  it('shows header actions from the view definition and dispatches them', () => {
    const { dispatched } = setup(true);
    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
    expect(dispatched).toEqual([{ type: 'SetMuted', muted: true }]);
  });

  it('delivers no frames to a slot covered by a maximized slot (SC-006, US3-AS2)', () => {
    frameUpdates = 0;
    const hub = createFrameStateHub();
    const services: AppServices = { ...createIdleServices(), frameState: hub };
    const demand = createFrameDemand(hub);
    render(
      <ServicesContext value={services}>
        <Slot content={{ viewTypeId: 'probe', viewState: null }} shown={false} visible={false} size={320} demand={demand} onCycle={vi.fn()} onViewStateChange={vi.fn()} />
      </ServicesContext>,
    );
    act(() => {
      for (let frame = 1; frame <= 60; frame++) hub.offer(frame, () => snapshot(frame));
    });
    expect(frameUpdates).toBe(0);
    expect(hub.getPublishRate()).toEqual({ kind: 'on-demand' });
  });

  it('passes visible = false to a hidden slot and delivers no frames to it', () => {
    frameUpdates = 0;
    const { hub } = setup(false);
    expect(screen.getByTestId('visible').textContent).toBe('false');
    act(() => {
      for (let frame = 1; frame <= 5; frame++) hub.offer(frame, () => snapshot(frame));
    });
    expect(frameUpdates).toBe(0);
    expect(renders).toBeGreaterThan(0);
  });
});
