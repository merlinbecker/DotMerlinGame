import { describe, expectTypeOf, it } from 'vitest';
import type {
  HeaderAction,
  LayoutState,
  Notice,
  SessionState,
  ViewAction,
  ViewContext,
  ViewDefinition,
} from '../../src/core/index.ts';

declare const context: ViewContext;

describe('view context', () => {
  it('only changes things through dispatch', () => {
    expectTypeOf<keyof ViewContext>().toEqualTypeOf<
      'size' | 'frameState' | 'events' | 'project' | 'session' | 'dispatch' | 'visible'
    >();
  });

  it('reads the emulator session read-only', () => {
    expectTypeOf(context.session.getSnapshot()).toEqualTypeOf<SessionState>();
    expectTypeOf<SessionState['runState']>().toEqualTypeOf<'empty' | 'running' | 'paused' | 'halted'>();
    expectTypeOf<Notice['kind']>().toEqualTypeOf<'header-invalid' | 'halted' | 'rejected' | 'storage-full' | 'audio-locked'>();
    // @ts-expect-error the session source has no setters
    context.session.setSnapshot({});
  });

  it('cannot publish domain events', () => {
    // @ts-expect-error views may only subscribe to events
    context.events.publish({ type: 'ProjectChanged', projectId: 'p1' });
  });

  it('cannot change the publish rate of the frame state', () => {
    // @ts-expect-error views get a read-only frame state source
    context.frameState.setPublishRate({ kind: 'full' });
  });
});

describe('view actions (M1, M1b)', () => {
  it('adds exactly the M1 and M1b actions to the M0 union', () => {
    expectTypeOf<ViewAction['type']>().toEqualTypeOf<
      | 'Pause'
      | 'Resume'
      | 'Reset'
      | 'SetBreakpoint'
      | 'ClearBreakpoint'
      | 'ButtonDown'
      | 'ButtonUp'
      | 'LoadRom'
      | 'StartStoredRom'
      | 'SetBootMode'
      | 'SetHardwareChecks'
      | 'SetVolume'
      | 'SetMuted'
      | 'UnlockAudio'
      | 'SetFrameRate'
      | 'RequestSnapshot'
    >();
  });

  it('asks for one snapshot per slot without payload (M1b)', () => {
    context.dispatch({ type: 'RequestSnapshot' });
    expectTypeOf<Extract<ViewAction, { type: 'RequestSnapshot' }>>().toEqualTypeOf<{ readonly type: 'RequestSnapshot' }>();
  });

  it('requires the payload of LoadRom and SetFrameRate', () => {
    context.dispatch({ type: 'LoadRom', bytes: new Uint8Array(0), fileName: 'a.gb' });
    context.dispatch({ type: 'SetFrameRate', rate: { kind: 'reduced', everyNthFrame: 15 } });
    // @ts-expect-error LoadRom needs bytes and a file name
    context.dispatch({ type: 'LoadRom' });
    // @ts-expect-error unknown boot mode
    context.dispatch({ type: 'SetBootMode', bootMode: 'nintendo' });
  });
});

describe('view definition and layout (M1)', () => {
  it('may provide header actions derived from the session, but no zoom gesture flag', () => {
    expectTypeOf<NonNullable<ViewDefinition<unknown>['headerActions']>>().toEqualTypeOf<
      (session: SessionState) => readonly HeaderAction[]
    >();
    expectTypeOf<HeaderAction['action']>().toEqualTypeOf<ViewAction>();
    expectTypeOf<keyof ViewDefinition<unknown>>().not.toEqualTypeOf<'doubleTapZoom'>();
  });

  it('lets a view declare that it reads inspection data, nothing else (M1b)', () => {
    expectTypeOf<ViewDefinition<unknown>['inspects']>().toEqualTypeOf<true | undefined>();
    // @ts-expect-error inspects is only ever true
    const definition: Pick<ViewDefinition<unknown>, 'inspects'> = { inspects: false };
    expectTypeOf(definition).toBeObject();
  });

  it('stores the maximized slot only in the layout', () => {
    expectTypeOf<LayoutState['maximizedSlot']>().toEqualTypeOf<number | null>();
    expectTypeOf<LayoutState['version']>().toEqualTypeOf<1>();
  });
});
