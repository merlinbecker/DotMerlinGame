import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultSettings, encodeSource, IDLE_PROJECT_STATE, type ProjectState } from '../../src/core/index.ts';
import { INITIAL_PROJECT_STATE, projectDefinition, type ProjectTab } from '../../src/views/project/definition.ts';
import { ProjectView } from '../../src/views/project/ProjectView.tsx';
import { fakeViewContext } from '../support/dispatch-spy.ts';

const summaries = ['a', 'b', 'c', 'd'].map((name) => ({ id: name, name, updatedAt: '' }));

function show(patch: Partial<ProjectState>, page = 0, tab: ProjectTab = 'projects') {
  const fake = fakeViewContext();
  const state = { ...IDLE_PROJECT_STATE, examples: [{ id: 'hello', name: 'hello' }], ...patch };
  const context = { ...fake.context, project: { subscribe: () => () => undefined, getSnapshot: () => state } };
  render(<ProjectView context={context} state={{ page, tab }} setState={() => undefined} />);
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

  const open = {
    id: 'p',
    name: 'p',
    settings: defaultSettings('p'),
    files: [{ path: 'main.asm', content: encodeSource('') }, { path: 'a.inc', content: encodeSource('') }],
  };

  it('creates, renames and deletes files; the entry file cannot be deleted', () => {
    const fake = show({ project: open, activeFile: 'main.asm' }, 0, 'files');
    fireEvent.change(screen.getByLabelText('New file path'), { target: { value: 'b.inc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply New file path' }));
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Delete main.asm' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Rename a.inc' }));
    fireEvent.change(screen.getByLabelText('New path for a.inc'), { target: { value: 'c.inc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply New path for a.inc' }));
    expect(fake.actions).toEqual([{ type: 'CreateFile', path: 'b.inc' }, { type: 'RenameFile', from: 'a.inc', to: 'c.inc' }]);
  });

  it('asks before deleting a file', () => {
    const fake = show({ project: open, activeFile: 'main.asm' }, 0, 'files');
    fireEvent.click(screen.getByRole('button', { name: 'Delete a.inc' }));
    expect(fake.actions).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete a.inc' }));
    expect(fake.actions).toEqual([{ type: 'DeleteFile', path: 'a.inc' }]);
  });

  it('changes the name on the first settings page', () => {
    const fake = show({ project: open }, 0, 'settings');
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'q' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Project name' }));
    expect(fake.actions).toEqual([{ type: 'RenameProject', name: 'q' }]);
  });

  it('hides cartridge settings while the header is kept', () => {
    const fake = show({ project: { ...open, settings: { ...open.settings, fixHeader: false } } }, 1, 'settings');
    expect(screen.queryByLabelText('Cartridge')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Fix header with rgbfix' }));
    expect(fake.actions).toEqual([{ type: 'SetProjectSettings', settings: { ...open.settings, fixHeader: true } }]);
  });

  it.each([
    ['identical', 'byte-identical'],
    ['padded', 'fill the last bank'],
    ['different', 'differs'],
    ['not-verified', 'did not finish'],
  ] as const)('tells the import result %s', (verdict, text) => {
    show({ romImport: { status: 'done', result: { verdict, paddedBytes: 4 } } });
    expect(screen.getByTestId('rom-import').textContent).toContain(text);
  });

  it('shows the import progress as text and blocks a second import', () => {
    show({ romImport: { status: 'running', bank: 1, banks: 8 } });
    expect(screen.getByTestId('rom-import').textContent).toBe('Importing bank 2 of 8');
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Import ROM' }).disabled).toBe(true);
  });

  it('changes cartridge settings on the next page', () => {
    const fake = show({ project: open }, 1, 'settings');
    fireEvent.change(screen.getByLabelText('Cartridge'), { target: { value: 'MBC5+RAM' } });
    fireEvent.change(screen.getByLabelText('Cartridge RAM'), { target: { value: '2' } });
    expect(fake.actions).toEqual([
      { type: 'SetProjectSettings', settings: { ...open.settings, mbc: 'MBC5+RAM' } },
      { type: 'SetProjectSettings', settings: { ...open.settings, ramSize: 2 } },
    ]);
  });

  it('round trips its tab and survives bad data', () => {
    expect(projectDefinition.deserialize(projectDefinition.serialize({ page: 1, tab: 'files' }))).toEqual({ page: 1, tab: 'files' });
    expect(projectDefinition.deserialize({ tab: 'nope' })).toEqual(INITIAL_PROJECT_STATE);
  });

  it('shows the reason of a rejected archive as text', () => {
    show({ notice: { kind: 'import-rejected', reason: 'unsafe-path' } });
    expect(screen.getByRole('status').textContent).toContain('outside the project');
  });
});
