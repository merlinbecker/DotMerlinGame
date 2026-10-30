import { describe, expect, it } from 'vitest';
import { IDLE_PROJECT_STATE, type JsonValue, type ViewAction, type ViewContext, type ViewDefinition } from '../../src/core/index.ts';
import { staticSession } from '../support/session.ts';

interface CounterState {
  readonly counter: number;
}

function isJsonObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const counterView: ViewDefinition<CounterState> = {
  typeId: 'counter',
  title: 'Counter',
  icon: 'counter',
  initialState: { counter: 0 },
  serialize: (state) => ({ counter: state.counter }),
  deserialize: (json: JsonValue) => {
    if (isJsonObject(json) && typeof json.counter === 'number') return { counter: json.counter };
    return { counter: 0 };
  },
};

function fakeContext(dispatched: ViewAction[]): ViewContext {
  const noSubscription = () => () => undefined;
  return {
    size: { width: 320, height: 320 },
    frameState: { subscribe: noSubscription, getSnapshot: () => null },
    events: { subscribe: noSubscription },
    project: { subscribe: noSubscription, getSnapshot: () => IDLE_PROJECT_STATE },
    session: staticSession(),
    dispatch: (action) => dispatched.push(action),
    visible: true,
  };
}

describe('view contract', () => {
  it('round-trips view state through serialize and deserialize', () => {
    const state: CounterState = { counter: 42 };
    expect(counterView.deserialize(counterView.serialize(state))).toEqual(state);
  });

  it('falls back to a valid state for unknown json', () => {
    expect(counterView.deserialize('garbage')).toEqual({ counter: 0 });
  });

  it('records actions sent through dispatch', () => {
    const dispatched: ViewAction[] = [];
    const context = fakeContext(dispatched);
    context.dispatch({ type: 'Pause' });
    context.dispatch({ type: 'ButtonDown', button: 'A' });
    expect(dispatched).toEqual([{ type: 'Pause' }, { type: 'ButtonDown', button: 'A' }]);
  });
});
