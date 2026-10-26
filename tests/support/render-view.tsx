import { act, render } from '@testing-library/react';
import { useState, type ComponentType } from 'react';
import type { FrameSnapshot, ViewInstanceProps } from '../../src/core/index.ts';
import { parseHeader } from '../../src/core/rom/header.ts';
import { fakeViewContext } from './dispatch-spy.ts';

/**
 * Renders a view with its state held like the grid does and a fake context (tests/support/dispatch-spy.ts).
 * With `snapshot`, a ROM header is put into the session so the view sees a loaded ROM.
 */
export async function renderView<S>(Component: ComponentType<ViewInstanceProps<S>>, initialState: S, snapshot: FrameSnapshot | null, options: { visible?: boolean } = {}) {
  const fake = fakeViewContext(options);
  if (snapshot?.inspection) fake.setSession({ rom: await parseHeader(snapshot.inspection.rom), runState: 'running' });
  const states: S[] = [];
  function Host() {
    const [state, setState] = useState(initialState);
    states.push(state);
    return <Component context={fake.context} state={state} setState={setState} />;
  }
  const result = render(<Host />);
  act(() => {
    fake.setSnapshot(snapshot);
  });
  return { ...fake, ...result, states, show: (next: FrameSnapshot | null) => { act(() => { fake.setSnapshot(next); }); } };
}

/** A copy of a snapshot with changed inspection bytes, to provoke change marks. */
export function withChanges(snapshot: FrameSnapshot, change: (copy: { wram: Uint8Array; oam: Uint8Array; vram: Uint8Array }) => void): FrameSnapshot {
  const inspection = snapshot.inspection;
  if (!inspection) throw new Error('no inspection data');
  const copy = { wram: inspection.wram.slice(), oam: inspection.oam.slice(), vram: inspection.vram.slice() };
  change(copy);
  return { ...snapshot, frame: snapshot.frame + 60, inspection: { ...inspection, ...copy } };
}
