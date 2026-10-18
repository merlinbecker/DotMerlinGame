import { describe, expectTypeOf, it } from 'vitest';
import type { ViewContext } from '../../src/core/index.ts';

declare const context: ViewContext;

describe('view context', () => {
  it('only changes things through dispatch', () => {
    expectTypeOf<keyof ViewContext>().toEqualTypeOf<
      'size' | 'frameState' | 'events' | 'project' | 'dispatch' | 'visible'
    >();
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
