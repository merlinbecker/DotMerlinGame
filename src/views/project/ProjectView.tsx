import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { MAX_PROJECT_NAME_LENGTH, MBC_OPTIONS, RAM_SIZE_OPTIONS, type ArchiveRejectReason, type FileProblem, type Project, type ProjectNotice, type RomImportResult, type ProjectSettings, type ViewAction, type ViewInstanceProps } from '../../core/index.ts';
import { Pager } from '../inspect-common/Pager.tsx';
import { useFit } from '../inspect-common/useFit.ts';
import common from '../inspect-common/Inspect.module.css';
import { PROJECT_TABS, type ProjectTab, type ProjectViewState } from './definition.ts';
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

const FILE_PROBLEM: Record<FileProblem, string> = {
  'invalid-path': 'This is not a valid file path inside the project.',
  'path-exists': 'A file with this path already exists.',
  'last-file': 'A project needs at least one file.',
  'entry-file': 'This is the entry file. Choose another entry file in Settings first.',
  'no-such-file': 'This file does not exist.',
};

function noticeText(notice: ProjectNotice): string {
  switch (notice.kind) {
    case 'storage-full':
      return 'Storage is full. Your text is kept here but not saved.';
    case 'import-rejected':
      return REJECTED[notice.reason];
    case 'file-rejected':
      return FILE_PROBLEM[notice.reason];
    case 'empty-rom':
      return 'This file is empty.';
    case 'name-rejected':
      return `The name must not be empty, must be unique and may have ${String(MAX_PROJECT_NAME_LENGTH)} characters.`;
    case 'settings-rejected':
      return 'These settings are not valid.';
    case 'action-failed':
      return 'That did not work. Try again, or reload the page.';
  }
}

function importText(result: RomImportResult): string {
  switch (result.verdict) {
    case 'identical':
      return 'Imported. The build is byte-identical to the ROM.';
    case 'padded':
      return `Imported. The build equals the ROM plus ${String(result.paddedBytes)} bytes to fill the last bank.`;
    case 'different':
      return 'Imported, but the build differs from the ROM. Keep your ROM file.';
    case 'not-verified':
      return 'Imported, but the check did not finish. Tap Build to try again.';
  }
}

const TAB_LABEL: Record<ProjectTab, string> = { projects: 'Projects', files: 'Files', settings: 'Settings' };
/** One row with large touch targets. */
const ROW_HEIGHT = 56;

/** Pages rows to fit the slot, so small slots stay usable without scrolling. */
function PagedRows({ rows, page, onPage }: { readonly rows: readonly ReactNode[]; readonly page: number; readonly onPage: (page: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const fit = useFit(box);
  const perPage = fit.height > 0 ? Math.max(1, Math.floor(fit.height / ROW_HEIGHT)) : PROJECTS_PER_PAGE;
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const shown = Math.min(page, pages - 1);
  return (
    <>
      <div ref={box} className={styles.list}>
        {rows.slice(shown * perPage, (shown + 1) * perPage)}
      </div>
      {pages > 1 && <Pager page={shown} pages={pages} onPage={onPage} />}
    </>
  );
}

function TextRow({ label, value, onApply }: { readonly label: string; readonly value: string; readonly onApply: (value: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <form
      className={styles.row}
      onSubmit={(event) => {
        event.preventDefault();
        onApply(text);
      }}
    >
      <input
        aria-label={label}
        placeholder={label}
        className={`${common.button} ${styles.grow}`}
        value={text}
        autoCapitalize="off"
        onChange={(event) => {
          setText(event.target.value);
        }}
      />
      <button type="submit" className={common.button} aria-label={`Apply ${label}`}>
        OK
      </button>
    </form>
  );
}

function FilesTab({ project, activeFile, dispatch, page, onPage }: { readonly project: Project; readonly activeFile: string | null; readonly dispatch: (action: ViewAction) => void; readonly page: number; readonly onPage: (page: number) => void }) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const rows = [
    <TextRow key="new" label="New file path" value="" onApply={(path) => { dispatch({ type: 'CreateFile', path }); }} />,
    ...project.files.map((file) => {
      if (renaming === file.path) {
        return (
          <TextRow
            key={file.path}
            label={`New path for ${file.path}`}
            value={file.path}
            onApply={(to) => {
              dispatch({ type: 'RenameFile', from: file.path, to });
              setRenaming(null);
            }}
          />
        );
      }
      if (deleting === file.path) {
        return (
          <div key={file.path} className={styles.row} role="alertdialog" aria-label={`Delete ${file.path}`}>
            <button type="button" className={common.button} onClick={() => { dispatch({ type: 'DeleteFile', path: file.path }); setDeleting(null); }}>
              Delete {file.path}
            </button>
            <button type="button" className={common.button} onClick={() => { setDeleting(null); }}>
              Cancel
            </button>
          </div>
        );
      }
      return (
        <div key={file.path} className={styles.row} data-testid="file-row">
          <button type="button" className={`${common.button} ${styles.grow}`} aria-pressed={activeFile === file.path} onClick={() => { dispatch({ type: 'OpenFile', path: file.path }); }}>
            {file.path}
          </button>
          <button type="button" className={common.button} aria-label={`Rename ${file.path}`} onClick={() => { setRenaming(file.path); }}>
            Rename
          </button>
          <button type="button" className={common.button} aria-label={`Delete ${file.path}`} disabled={project.settings.entry === file.path} onClick={() => { setDeleting(file.path); }}>
            Delete
          </button>
        </div>
      );
    }),
  ];
  return <PagedRows rows={rows} page={page} onPage={onPage} />;
}

function SettingsTab({ project, dispatch, page, onPage }: { readonly project: Project; readonly dispatch: (action: ViewAction) => void; readonly page: number; readonly onPage: (page: number) => void }) {
  const { settings } = project;
  const set = (patch: Partial<ProjectSettings>) => {
    dispatch({ type: 'SetProjectSettings', settings: { ...settings, ...patch } });
  };
  const select = (label: string, value: string, options: readonly (readonly [string, string])[], onChange: (value: string) => void) => (
    <label key={label} className={styles.row}>
      <span className={styles.fieldName}>{label}</span>
      <select aria-label={label} className={`${common.button} ${styles.grow}`} value={value} onChange={(event) => { onChange(event.target.value); }}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
  const fix = settings.fixHeader;
  const rows = [
    <TextRow key={`name:${project.name}`} label="Project name" value={project.name} onApply={(name) => { dispatch({ type: 'RenameProject', name }); }} />,
    <TextRow key={`title:${settings.title}`} label="ROM title" value={settings.title} onApply={(title) => { set({ title }); }} />,
    select('Entry file', settings.entry, project.files.map((f) => [f.path, f.path] as const), (entry) => { set({ entry }); }),
    <button key="fix" type="button" className={common.button} aria-pressed={fix} onClick={() => { set({ fixHeader: !fix }); }}>
      Fix header with rgbfix
    </button>,
    !fix && <p key="kept" className={common.note}>The header stays as written in the source.</p>,
    fix && select('Cartridge', settings.mbc, MBC_OPTIONS.map((mbc) => [mbc, mbc] as const), (mbc) => { set({ mbc }); }),
    fix && select('Cartridge RAM', String(settings.ramSize), RAM_SIZE_OPTIONS.map((o) => [String(o.code), o.label] as const), (ramSize) => { set({ ramSize: Number(ramSize) }); }),
  ].filter(Boolean);
  return <PagedRows rows={rows} page={page} onPage={onPage} />;
}

/** Projects on this device: new from an example, open, delete, ZIP export and import (US3, US4). */
export function ProjectView({ context, state, setState }: ViewInstanceProps<ProjectViewState>) {
  const project = useSyncExternalStore(
    (onChange) => context.project.subscribe(onChange),
    () => context.project.getSnapshot(),
  );
  const input = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const romInput = useRef<HTMLInputElement>(null);
  const { projects, examples, importConflict, notice, romImport } = project;
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

  const tabs = (
    <div className={styles.tabs} role="group" aria-label="Pages">
      {PROJECT_TABS.map((tab) => (
        <button key={tab} type="button" className={`${common.button} ${styles.grow}`} aria-pressed={state.tab === tab} onClick={() => { setState({ page: 0, tab }); }}>
          {TAB_LABEL[tab]}
        </button>
      ))}
    </div>
  );
  const message = notice && (
    <p className={common.notice} role="status">
      {noticeText(notice)}
    </p>
  );
  if (state.tab !== 'projects') {
    const onPage = (next: number) => {
      setState({ ...state, page: next });
    };
    const dispatch = (action: ViewAction) => {
      context.dispatch(action);
    };
    return (
      <div className={styles.project}>
        {tabs}
        {message}
        {!project.project && <p className={common.notice}>No project open.</p>}
        {project.project && state.tab === 'files' && <FilesTab project={project.project} activeFile={project.activeFile} dispatch={dispatch} page={state.page} onPage={onPage} />}
        {project.project && state.tab === 'settings' && <SettingsTab project={project.project} dispatch={dispatch} page={state.page} onPage={onPage} />}
      </div>
    );
  }

  return (
    <div className={styles.project}>
      {tabs}
      <div className={common.bar}>
        {examples.map((example) => (
          <button key={example.id} type="button" className={common.button} onClick={() => { context.dispatch({ type: 'NewProjectFromExample', exampleId: example.id }); }}>
            New: {example.name}
          </button>
        ))}
        <button type="button" className={common.button} onClick={() => input.current?.click()}>
          Import ZIP
        </button>
        <button type="button" className={common.button} disabled={romImport.status === 'running'} onClick={() => romInput.current?.click()}>
          Import ROM
        </button>
        <button type="button" className={common.button} disabled={!project.project} onClick={() => { context.dispatch({ type: 'ExportZip' }); }}>
          Export ZIP
        </button>
      </div>
      {message}
      {romImport.status === 'running' && (
        <p className={common.notice} role="status" data-testid="rom-import">
          Importing bank {romImport.bank + 1} of {romImport.banks}
        </p>
      )}
      {romImport.status === 'done' && (
        <p className={common.notice} role="status" data-testid="rom-import">
          {importText(romImport.result)}
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
            setState({ ...state, page: next });
          }}
        />
      )}
      <input
        ref={romInput}
        className={styles.file}
        type="file"
        accept=".gb,.gbc,.bin,application/octet-stream"
        data-testid="rom-import-file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void file.arrayBuffer().then((buffer) => { context.dispatch({ type: 'ImportRom', bytes: new Uint8Array(buffer), fileName: file.name }); });
        }}
      />
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
