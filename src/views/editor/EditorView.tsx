import { useState, useSyncExternalStore, type ComponentType } from 'react';
import { decodeSource, type SourceEditorProps, type ViewInstanceProps } from '../../core/index.ts';
import { Pager } from '../inspect-common/Pager.tsx';
import common from '../inspect-common/Inspect.module.css';
import type { EditorViewState } from './definition.ts';
import styles from './EditorView.module.css';

const SAVE_LABEL = { saved: 'Saved', pending: 'Saving', failed: 'Not saved' } as const;

/** The editor component comes from the app, because views never import adapters (Constitution III). */
export function createEditorView(SourceEditor: ComponentType<SourceEditorProps>) {
  return function EditorView({ context, state, setState }: ViewInstanceProps<EditorViewState>) {
    const projectState = useSyncExternalStore(
      (onChange) => context.project.subscribe(onChange),
      () => context.project.getSnapshot(),
    );
    const [pages, setPages] = useState(1);
    const { project, activeFile, cursorTarget, saveState } = projectState;

    if (!project) {
      return (
        <p className={common.notice} role="status">
          No project open. Use the Project view.
        </p>
      );
    }
    const file = project.files.find((f) => f.path === activeFile);
    const text = file ? decodeSource(file) : null;

    return (
      <div className={styles.editorView}>
        <div className={styles.controls}>
          <select
            aria-label="File"
            className={`${common.button} ${styles.file}`}
            value={activeFile ?? ''}
            onChange={(event) => {
              setState({ page: 0 });
              context.dispatch({ type: 'OpenFile', path: event.target.value });
            }}
          >
            {project.files.map((f) => (
              <option key={f.path} value={f.path}>
                {f.path}
              </option>
            ))}
          </select>
          <span data-testid="save-state">{SAVE_LABEL[saveState]}</span>
        </div>
        {file && text !== null ? (
          <SourceEditor
            path={file.path}
            text={text}
            page={state.page}
            target={cursorTarget}
            onChange={(next) => {
              context.dispatch({ type: 'EditFile', path: file.path, text: next });
            }}
            onPageInfo={(page, count) => {
              setPages(count);
              if (page !== state.page) setState({ page });
            }}
          />
        ) : (
          <p className={common.notice} role="status">
            This file is not text and cannot be edited here.
          </p>
        )}
        <Pager
          page={Math.min(state.page, pages - 1)}
          pages={pages}
          onPage={(page) => {
            setState({ page });
          }}
        />
      </div>
    );
  };
}
