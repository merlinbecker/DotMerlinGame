import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useInspection } from '../../src/views/inspect-common/useInspection.ts';
import { expectOnlyInspectActions, fakeViewContext } from '../support/dispatch-spy.ts';
import { fixtureSnapshots } from '../support/inspection-fixtures.ts';

afterEach(cleanup);

describe('useInspection (contracts/view-contract.md)', () => {
  it('sets the slot rate and asks for one snapshot when mounted', () => {
    const fake = fakeViewContext();
    renderHook(() => useInspection(fake.context, 'second'));
    expect(fake.actions).toEqual([
      { type: 'SetFrameRate', rate: { kind: 'reduced', everyNthFrame: 60 } },
      { type: 'RequestSnapshot' },
    ]);
  });

  it('follows a rate change', () => {
    const fake = fakeViewContext();
    const { rerender } = renderHook(({ rate }) => useInspection(fake.context, rate), { initialProps: { rate: 'second' as const as 'second' | 'manual' } });
    rerender({ rate: 'manual' });
    expect(fake.actions.at(-1)).toEqual({ type: 'SetFrameRate', rate: { kind: 'on-demand' } });
  });

  it.each([
    [{ type: 'RunStateChanged', runState: 'paused' }],
    [{ type: 'RunStateChanged', runState: 'halted' }],
    [{ type: 'RunStateChanged', runState: 'empty' }],
    [{ type: 'RomLoaded', romId: 'x', title: 'X' }],
    [{ type: 'EmulatorReset' }],
    [{ type: 'EmulatorHalted', reason: 'header-logo' }],
  ] as const)('asks for a snapshot on %o', (event) => {
    const fake = fakeViewContext();
    renderHook(() => useInspection(fake.context, 'second'));
    fake.actions.length = 0;
    act(() => {
      fake.events.publish(event);
    });
    expect(fake.actions).toEqual([{ type: 'RequestSnapshot' }]);
  });

  it('does not ask while running on', () => {
    const fake = fakeViewContext();
    renderHook(() => useInspection(fake.context, 'second'));
    fake.actions.length = 0;
    act(() => {
      fake.events.publish({ type: 'RunStateChanged', runState: 'running' });
    });
    expect(fake.actions).toEqual([]);
  });

  it('asks for nothing while hidden', () => {
    const fake = fakeViewContext({ visible: false });
    renderHook(() => useInspection(fake.context, 'live'));
    fake.events.publish({ type: 'EmulatorReset' });
    expect(fake.actions).toEqual([{ type: 'SetFrameRate', rate: { kind: 'reduced', everyNthFrame: 6 } }]);
    expectOnlyInspectActions(fake.actions);
  });

  it('returns the snapshot and its inspection data', () => {
    const fake = fakeViewContext();
    const { result } = renderHook(() => useInspection(fake.context, 'second'));
    const [snapshot] = fixtureSnapshots('inspect-mem');
    act(() => {
      fake.setSnapshot(snapshot ?? null);
    });
    expect(result.current.inspection?.romBank).toBe(3);
  });
});
