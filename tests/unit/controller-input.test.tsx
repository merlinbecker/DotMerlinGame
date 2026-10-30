import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { IDLE_PROJECT_STATE, type ViewAction, type ViewContext } from '../../src/core/index.ts';
import { ControllerView } from '../../src/views/controller/ControllerView.tsx';
import { staticSession } from '../support/session.ts';

beforeAll(() => {
  // jsdom lacks pointer capture.
  Element.prototype.setPointerCapture = () => undefined;
});
afterEach(cleanup);

function setup() {
  const actions: ViewAction[] = [];
  const noSubscription = () => () => undefined;
  const context: ViewContext = {
    size: { width: 320, height: 320 },
    frameState: { subscribe: noSubscription, getSnapshot: () => null },
    events: { subscribe: noSubscription },
    project: { subscribe: noSubscription, getSnapshot: () => IDLE_PROJECT_STATE },
    session: staticSession(),
    dispatch: (action) => actions.push(action),
    visible: true,
  };
  render(<ControllerView context={context} state={null} setState={() => undefined} />);
  return actions;
}

describe('controller view', () => {
  it('offers all eight buttons', () => {
    setup();
    for (const name of ['Up', 'Down', 'Left', 'Right', 'A', 'B', 'Start', 'Select']) expect(screen.getByRole('button', { name })).toBeTruthy();
  });

  it('presses two buttons at once with two pointers', () => {
    const actions = setup();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Right' }), { pointerId: 1 });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'A' }), { pointerId: 2 });
    fireEvent.pointerUp(screen.getByRole('button', { name: 'A' }), { pointerId: 2 });
    expect(actions).toEqual([
      { type: 'ButtonDown', button: 'Right' },
      { type: 'ButtonDown', button: 'A' },
      { type: 'ButtonUp', button: 'A' },
    ]);
  });

  it('releases a button when the pointer is cancelled', () => {
    const actions = setup();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'B' }), { pointerId: 1 });
    fireEvent.pointerCancel(screen.getByRole('button', { name: 'B' }), { pointerId: 1 });
    expect(actions.at(-1)).toEqual({ type: 'ButtonUp', button: 'B' });
  });
});
