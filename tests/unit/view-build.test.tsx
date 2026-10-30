import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultSettings, IDLE_PROJECT_STATE, type BuildState, type ProjectState } from '../../src/core/index.ts';
import { BuildView } from '../../src/views/build/BuildView.tsx';
import { buildDefinition, INITIAL_BUILD_STATE } from '../../src/views/build/definition.ts';
import { fakeViewContext } from '../support/dispatch-spy.ts';

const project = { id: 'p', name: 'p', settings: defaultSettings('p'), files: [] };

function show(patch: Partial<ProjectState>) {
  const fake = fakeViewContext();
  const state = { ...IDLE_PROJECT_STATE, project, ...patch };
  const context = { ...fake.context, project: { subscribe: () => () => undefined, getSnapshot: () => state } };
  render(<BuildView context={context} state={INITIAL_BUILD_STATE} setState={() => undefined} />);
  return fake;
}

const failed: BuildState = {
  status: 'failed',
  result: {
    success: false,
    durationMs: 3,
    diagnostics: [
      { file: 'main.asm', line: 7, severity: 'error', message: 'bad', tool: 'rgbasm' },
      { file: null, line: null, severity: 'warning', message: 'general', tool: 'rgbfix' },
    ],
  },
};

describe('Build view', () => {
  afterEach(cleanup);

  it('points to the Project view without a project', () => {
    show({ project: null });
    expect(screen.getByRole('status').textContent).toContain('Project view');
  });

  it('blocks run and export without a build and says why (US2-AS3)', () => {
    show({});
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Export .gb' }).disabled).toBe(true);
    expect(screen.getByTestId('export-blocked').textContent).toBe('Build first.');
  });

  it('blocks export after a failed build and says why', () => {
    show({ build: failed });
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Run' }).disabled).toBe(true);
    expect(screen.getByTestId('export-blocked').textContent).toBe('The last build failed.');
  });

  it('allows run and export after a build and shows the duration', () => {
    const fake = show({ build: { status: 'finished', result: { success: true, rom: new Uint8Array(1), diagnostics: [], durationMs: 12.4 } } });
    expect(screen.getByTestId('build-status').textContent).toContain('12 ms');
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export .gb' }));
    expect(fake.actions).toEqual([{ type: 'RunBuild' }, { type: 'ExportRom' }]);
  });

  it('leads a tapped message to its line; a message without a place cannot be tapped', () => {
    const fake = show({ build: failed });
    const [first, second] = screen.getAllByTestId<HTMLButtonElement>('diagnostic');
    expect(first?.textContent).toContain('Error main.asm:7: bad');
    expect(second?.disabled).toBe(true);
    if (first) fireEvent.click(first);
    expect(fake.actions).toEqual([{ type: 'GoToDiagnostic', file: 'main.asm', line: 7 }]);
  });

  it('says when the source changed since the build', () => {
    show({ build: failed, buildIsStale: true });
    expect(screen.getByText('Source changed since this build.')).toBeTruthy();
  });

  it('explains a timeout', () => {
    show({ build: { status: 'timed-out', result: { success: false, timedOut: true, diagnostics: [], durationMs: 10000 } } });
    expect(screen.getByTestId('build-status').textContent).toContain('took too long');
  });

  it('round trips its state and survives bad data', () => {
    expect(buildDefinition.deserialize(buildDefinition.serialize({ page: 2 }))).toEqual({ page: 2 });
    expect(buildDefinition.deserialize('x')).toEqual(INITIAL_BUILD_STATE);
  });
});
