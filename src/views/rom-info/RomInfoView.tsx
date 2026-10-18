import { useRef, useState, useSyncExternalStore } from 'react';
import type { ViewInstanceProps } from '../../core/index.ts';
import { noticeText } from './notice-text.ts';
import styles from './RomInfoView.module.css';

interface PendingFile {
  readonly bytes: Uint8Array;
  readonly fileName: string;
}

/** Loads ROMs and shows the session; all changes go through dispatch (FR-027). */
export function RomInfoView({ context }: ViewInstanceProps<null>) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingFile | null>(null);
  const session = useSyncExternalStore(
    (onChange) => context.session.subscribe(onChange),
    () => context.session.getSnapshot(),
  );
  const hasStoredRom = session.storedRomAvailable || session.rom !== null;

  const load = (file: PendingFile) => {
    setPending(null);
    context.dispatch({ type: 'LoadRom', bytes: file.bytes, fileName: file.fileName });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const picked = { bytes: new Uint8Array(await file.arrayBuffer()), fileName: file.name };
    if (input.current) input.current.value = '';
    if (hasStoredRom) setPending(picked);
    else load(picked);
  };

  return (
    <div className={styles.info}>
      <div className={styles.row}>
        <button type="button" className={styles.button} onClick={() => input.current?.click()}>
          Load ROM
        </button>
        {session.runState === 'empty' && session.storedRomAvailable && (
          <button type="button" className={styles.button} onClick={() => { context.dispatch({ type: 'StartStoredRom' }); }}>
            Start stored ROM
          </button>
        )}
        <input
          ref={input}
          className={styles.file}
          type="file"
          accept=".gb,.bin,application/octet-stream"
          data-testid="rom-file"
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
      </div>

      {pending && (
        <div className={styles.confirm} role="alertdialog" aria-label="Replace stored ROM">
          <p>Loading a new ROM replaces the stored ROM. Its save game will be lost; the ROM file itself stays on your device.</p>
          <div className={styles.row}>
            <button type="button" className={styles.button} onClick={() => { load(pending); }}>
              Replace
            </button>
            <button type="button" className={styles.button} onClick={() => { setPending(null); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {session.notice && (
        <p className={styles.notice} role="status">
          {noticeText(session.notice)}
        </p>
      )}

      <dl className={styles.facts}>
        <dt>State</dt>
        <dd data-testid="run-state">{session.runState}</dd>
        <dt>File</dt>
        <dd>{session.fileName ?? 'No ROM loaded'}</dd>
      </dl>
    </div>
  );
}
