import { useRef, useState, useSyncExternalStore } from 'react';
import type { ArchiveRejectReason, ProjectNotice, ViewInstanceProps } from '../../core/index.ts';
import { Pager } from '../inspect-common/Pager.tsx';
import common from '../inspect-common/Inspect.module.css';
import type { ProjectViewState } from './definition.ts';
import styles from './ProjectView.module.css';

const PROJECTS_PER_PAGE = 3;

const REJECTED: Record<ArchiveRejectReason, string> = {
  'not-a-zip': 'This file is not a valid ZIP archive.',
  'no-project-file': 'This archive has no project.json.',
  'unknown-format': 'This archive has an unknown format version.',
  'invalid-project': 'The project in this archive is not valid.',
  'unsafe-path': 'This archive has a path outside the project.',
  'duplicate-path': 'This archive has the same path twice.',
  'too-large': 'This archive is too large.',
  'too-many-files': 'This archive has too many files.',
};

function noticeText(notice: ProjectNotice): string {
  return notice.kind === 'storage-full' ? 'Storage is full. Your text is kept here but not saved.' : REJECTED[notice.reason];
}

/** Projects on this device: new from an example, open, delete, ZIP export and import (US3, US4). */
export function ProjectView({ context, state, setState }: ViewInstanceProps<ProjectViewState>) {
  const project = useSyncExternalStore(
    (onChange) => context.project.subscribe(onChange),
    () => context.project.getSnapshot(),
  );
  const input = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { projects, examples, importConflict, notice } = project;
  const pages = Math.max(1, Math.ceil(projects.length / PROJECTS_PER_PAGE));
  const page = Math.min(state.page, pages - 1);

  if (importConflict !== null) {
    return (
      <div className={styles.project} role="alertdialog" aria-label="Project exists">
        <p>A project named “{importConflict}” already exists.</p>
        <div className={common.bar}>
          <button type="button" className={common.button} onClick={() => { context.dispatch({ type: 'ResolveImport', choice: 'replace' }); }}>
            Replace
          </button>
          <button type="button" className={common.button} onClick={() => { context.dispatch({ type: 'ResolveImport', choice: 'copy' }); }}>
            Keep as copy
          </button>
          <button type="button" className={common.button} onClick={() => { context.dispatch({ type: 'ResolveImport', choice: 'cancel' }); }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const shown = deleting === null ? null : projects.find((p) => p.id === deleting);
  if (shown) {
    return (
      <div className={styles.project} role="alertdialog" aria-label="Delete project">
        <p>Delete “{shown.name}” from this device? This cannot be undone unless you have a ZIP.</p>
        <div className={common.bar}>
          <button
            type="button"
            className={common.button}
            onClick={() => {
              context.dispatch({ type: 'DeleteProject', projectId: shown.id });
              setDeleting(null);
            }}
          >
            Delete
          </button>
          <button type="button" className={common.button} onClick={() => { setDeleting(null); }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.project}>
      <div className={common.bar}>
        {examples.map((example) => (
          <button key={example.id} type="button" className={common.button} onClick={() => { context.dispatch({ type: 'NewProjectFromExample', exampleId: example.id }); }}>
            New: {example.name}
          </button>
        ))}
        <button type="button" className={common.button} onClick={() => input.current?.click()}>
          Import ZIP
        </button>
        <button type="button" className={common.button} disabled={!project.project} onClick={() => { context.dispatch({ type: 'ExportZip' }); }}>
          Export ZIP
        </button>
      </div>
      {notice && (
        <p className={common.notice} role="status">
          {noticeText(notice)}
        </p>
      )}
      {projects.length === 0 && <p className={common.notice}>No projects yet.</p>}
      <div className={styles.list}>
        {projects.slice(page * PROJECTS_PER_PAGE, (page + 1) * PROJECTS_PER_PAGE).map((summary) => (
          <div key={summary.id} className={common.bar} data-testid="project-row">
            <button
              type="button"
              className={`${common.button} ${styles.name}`}
              aria-pressed={project.project?.id === summary.id}
              onClick={() => { context.dispatch({ type: 'OpenProject', projectId: summary.id }); }}
            >
              {summary.name}
            </button>
            <button type="button" className={common.button} aria-label={`Delete ${summary.name}`} onClick={() => { setDeleting(summary.id); }}>
              Delete
            </button>
          </div>
        ))}
      </div>
      {pages > 1 && (
        <Pager
          page={page}
          pages={pages}
          onPage={(next) => {
            setState({ page: next });
          }}
        />
      )}
      <input
        ref={input}
        className={styles.file}
        type="file"
        accept=".zip,application/zip"
        data-testid="zip-file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void file.arrayBuffer().then((buffer) => { context.dispatch({ type: 'ImportZip', bytes: new Uint8Array(buffer) }); });
        }}
      />
    </div>
  );
}
