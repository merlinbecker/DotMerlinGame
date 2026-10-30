import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { IDLE_PROJECT_STATE, type ProjectState } from '../../src/core/index.ts';
import { INITIAL_PROJECT_STATE } from '../../src/views/project/definition.ts';
import { ProjectView } from '../../src/views/project/ProjectView.tsx';
import { fakeViewContext } from '../support/dispatch-spy.ts';

const summaries = ['a', 'b', 'c', 'd'].map((name) => ({ id: name, name, updatedAt: '' }));

function show(patch: Partial<ProjectState>, page = 0) {
  const fake = fakeViewContext();
  const state = { ...IDLE_PROJECT_STATE, examples: [{ id: 'hello', name: 'hello' }], ...patch };
  const context = { ...fake.context, project: { subscribe: () => () => undefined, getSnapshot: () => state } };
  render(<ProjectView context={context} state={{ page }} setState={() => undefined} />);
  return fake;
}

describe('Project view', () => {
  afterEach(cleanup);

  it('offers the examples when there are no projects (US4)', () => {
    const fake = show({});
    expect(screen.getByText('No projects yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'New: hello' }));
    expect(fake.actions).toEqual([{ type: 'NewProjectFromExample', exampleId: 'hello' }]);
  });

  it('pages the list instead of scrolling', () => {
    show({ projects: summaries });
    expect(screen.getAllByTestId('project-row')).toHaveLength(INITIAL_PROJECT_STATE.page + 3);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeTruthy();
  });

  it('opens a project', () => {
    const fake = show({ projects: summaries });
    fireEvent.click(screen.getByRole('button', { name: 'b' }));
    expect(fake.actions).toEqual([{ type: 'OpenProject', projectId: 'b' }]);
  });

  it('asks before deleting', () => {
    const fake = show({ projects: summaries });
    fireEvent.click(screen.getByRole('button', { name: 'Delete a' }));
    expect(fake.actions).toEqual([]);
    expect(screen.getByRole('alertdialog').textContent).toContain('a');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(fake.actions).toEqual([{ type: 'DeleteProject', projectId: 'a' }]);
  });

  it('asks on an import conflict (US3-AS4)', () => {
    const fake = show({ importConflict: 'a' });
    fireEvent.click(screen.getByRole('button', { name: 'Keep as copy' }));
    expect(fake.actions).toEqual([{ type: 'ResolveImport', choice: 'copy' }]);
  });

  it('shows the reason of a rejected archive as text', () => {
    show({ notice: { kind: 'import-rejected', reason: 'unsafe-path' } });
    expect(screen.getByRole('status').textContent).toContain('outside the project');
  });
});
