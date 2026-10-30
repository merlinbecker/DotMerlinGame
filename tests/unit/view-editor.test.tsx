import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultSettings, encodeSource, IDLE_PROJECT_STATE, type ProjectState, type SourceEditorProps } from '../../src/core/index.ts';
import { IDLE_SESSION } from '../../src/app/services.ts';
import { editorDefinition, INITIAL_EDITOR_STATE } from '../../src/views/editor/definition.ts';
import { createEditorView } from '../../src/views/editor/EditorView.tsx';
import { fakeViewContext } from '../support/dispatch-spy.ts';

const files = [
  { path: 'main.asm', content: encodeSource('nop') },
  { path: 'data.bin', content: new Uint8Array([0xff, 0xfe]) },
];
const project = { id: 'p', name: 'p', settings: defaultSettings('p'), files };

function StubEditor({ text, onChange }: SourceEditorProps) {
  return <textarea aria-label="stub" value={text} onChange={(event) => { onChange(event.target.value); }} />;
}
const EditorView = createEditorView(StubEditor);

function show(patch: Partial<ProjectState>) {
  const fake = fakeViewContext();
  const state = { ...IDLE_PROJECT_STATE, project, activeFile: 'main.asm', ...patch };
  const context = { ...fake.context, project: { subscribe: () => () => undefined, getSnapshot: () => state } };
  render(<EditorView context={context} state={INITIAL_EDITOR_STATE} setState={() => undefined} />);
  return fake;
}

describe('Editor view', () => {
  afterEach(cleanup);

  it('points to the Project view without a project', () => {
    show({ project: null });
    expect(screen.getByRole('status').textContent).toContain('Project view');
  });

  it('shows the text and sends edits', () => {
    const fake = show({});
    const editor = screen.getByLabelText<HTMLTextAreaElement>('stub');
    expect(editor.value).toBe('nop');
    fireEvent.change(editor, { target: { value: 'halt' } });
    expect(fake.actions).toEqual([{ type: 'EditFile', path: 'main.asm', text: 'halt' }]);
  });

  it('opens another file', () => {
    const fake = show({});
    fireEvent.change(screen.getByLabelText('File'), { target: { value: 'data.bin' } });
    expect(fake.actions).toEqual([{ type: 'OpenFile', path: 'data.bin' }]);
  });

  it('shows a note instead of a binary file', () => {
    show({ activeFile: 'data.bin' });
    expect(screen.queryByLabelText('stub')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('not text');
  });

  it.each([['saved', 'Saved'], ['pending', 'Saving'], ['failed', 'Not saved']] as const)('shows the save state %s as text', (saveState, label) => {
    show({ saveState });
    expect(screen.getByTestId('save-state').textContent).toBe(label);
  });

  it('has a Build action in the header', () => {
    expect(editorDefinition.headerActions?.(IDLE_SESSION)).toEqual([{ id: 'build', label: 'Build', action: { type: 'Build' } }]);
  });
});
