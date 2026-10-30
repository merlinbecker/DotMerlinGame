import { useRef, useSyncExternalStore } from 'react';
import type { BuildState, Diagnostic, ViewInstanceProps } from '../../core/index.ts';
import { Pager } from '../inspect-common/Pager.tsx';
import { useFit } from '../inspect-common/useFit.ts';
import common from '../inspect-common/Inspect.module.css';
import type { BuildViewState } from './definition.ts';
import styles from './BuildView.module.css';

/** Messages per page until the slot has been measured (and in tests without layout). */
const FALLBACK_MESSAGES = 4;
/** One message takes a large touch target. */
const MESSAGE_HEIGHT = 64;

function statusText(build: BuildState): string {
  switch (build.status) {
    case 'idle':
      return 'Not built yet';
    case 'running':
      return 'Building';
    case 'finished':
      return `Built in ${String(Math.round(build.result.durationMs))} ms`;
    case 'failed':
      return 'Build failed';
    case 'timed-out':
      return 'Build stopped: it took too long. Check for endless REPT or macros.';
  }
}

function blockedReason(build: BuildState): string | null {
  switch (build.status) {
    case 'finished':
      return null;
    case 'failed':
    case 'timed-out':
      return 'The last build failed.';
    case 'running':
      return 'Building.';
    case 'idle':
      return 'Build first.';
  }
}

const place = (d: Diagnostic) => (d.file === null ? d.tool : `${d.file}:${String(d.line)}`);

/** Build status and messages; tapping a message leads to its line (FR-004). */
export function BuildView({ context, state, setState }: ViewInstanceProps<BuildViewState>) {
  const project = useSyncExternalStore(
    (onChange) => context.project.subscribe(onChange),
    () => context.project.getSnapshot(),
  );
  const box = useRef<HTMLDivElement>(null);
  const fit = useFit(box);

  if (!project.project) {
    return (
      <p className={common.notice} role="status">
        No project open. Use the Project view.
      </p>
    );
  }
  const { build, buildIsStale } = project;
  const messages = 'result' in build ? build.result.diagnostics : [];
  const perPage = fit.height > 0 ? Math.max(1, Math.floor(fit.height / MESSAGE_HEIGHT)) : FALLBACK_MESSAGES;
  const pages = Math.max(1, Math.ceil(messages.length / perPage));
  const page = Math.min(state.page, pages - 1);
  const reason = blockedReason(build);

  return (
    <div className={styles.build}>
      <p className={styles.status} data-testid="build-status">
        {statusText(build)}
      </p>
      {buildIsStale && <p className={common.note}>Source changed since this build.</p>}
      <div className={common.bar}>
        <button type="button" className={common.button} disabled={reason !== null} onClick={() => { context.dispatch({ type: 'RunBuild' }); }}>
          Run
        </button>
        <button type="button" className={common.button} disabled={reason !== null} onClick={() => { context.dispatch({ type: 'ExportRom' }); }}>
          Export .gb
        </button>
        {reason && <span data-testid="export-blocked">{reason}</span>}
      </div>
      <div ref={box} className={styles.messages}>
        {messages.slice(page * perPage, (page + 1) * perPage).map((message, index) => {
          const { file, line } = message;
          return (
            <button
              key={`${String(page)}:${String(index)}`}
              type="button"
              className={`${common.button} ${styles.message}`}
              disabled={file === null || line === null}
              data-testid="diagnostic"
              onClick={() => {
                if (file !== null && line !== null) context.dispatch({ type: 'GoToDiagnostic', file, line });
              }}
            >
              <span className={styles.severity}>{message.severity === 'error' ? 'Error' : 'Warning'}</span> {place(message)}: {message.message}
            </button>
          );
        })}
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
    </div>
  );
}
