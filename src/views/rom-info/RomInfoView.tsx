import { useRef, useState, useSyncExternalStore } from 'react';
import type { ViewInstanceProps } from '../../core/index.ts';
import { noticeText } from './notice-text.ts';
import styles from './RomInfoView.module.css';

const VOLUME_STEP = 0.1;

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
        {session.runState === 'running' && (
          <button type="button" className={styles.button} onClick={() => { context.dispatch({ type: 'Pause' }); }}>
            Pause
          </button>
        )}
        {session.runState === 'paused' && (
          <button type="button" className={styles.button} onClick={() => { context.dispatch({ type: 'Resume' }); }}>
            Resume
          </button>
        )}
        {session.runState !== 'empty' && (
          <button type="button" className={styles.button} onClick={() => { context.dispatch({ type: 'Reset' }); }}>
            Reset
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

      <fieldset className={styles.group}>
        <legend>Start mode</legend>
        <div className={styles.row}>
          <button
            type="button"
            className={styles.button}
            aria-pressed={session.settings.bootMode === 'own-boot-rom'}
            onClick={() => { context.dispatch({ type: 'SetBootMode', bootMode: 'own-boot-rom' }); }}
          >
            Own boot ROM
          </button>
          <button
            type="button"
            className={styles.button}
            aria-pressed={session.settings.bootMode === 'direct-start'}
            onClick={() => { context.dispatch({ type: 'SetBootMode', bootMode: 'direct-start' }); }}
          >
            Direct start
          </button>
          <button
            type="button"
            className={styles.button}
            aria-pressed={session.settings.hardwareChecks}
            onClick={() => { context.dispatch({ type: 'SetHardwareChecks', enabled: !session.settings.hardwareChecks }); }}
          >
            Hardware-near checks
          </button>
        </div>
        <p className={styles.hint}>Takes effect on the next start or reset.</p>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>Sound</legend>
        <div className={styles.row}>
          <button
            type="button"
            className={styles.button}
            aria-label="Volume down"
            onClick={() => { context.dispatch({ type: 'SetVolume', volume: Math.max(0, session.audio.volume - VOLUME_STEP) }); }}
          >
            −
          </button>
          <span className={styles.value} data-testid="volume">
            Volume {Math.round(session.audio.volume * 100)} %
          </span>
          <button
            type="button"
            className={styles.button}
            aria-label="Volume up"
            onClick={() => { context.dispatch({ type: 'SetVolume', volume: Math.min(1, session.audio.volume + VOLUME_STEP) }); }}
          >
            +
          </button>
        </div>
        {!session.audio.unlocked && <p className={styles.hint}>Tap anywhere to enable sound.</p>}
      </fieldset>

      <dl className={styles.facts}>
        <dt>State</dt>
        <dd data-testid="run-state">{session.runState}</dd>
        <dt>File</dt>
        <dd>{session.fileName ?? 'No ROM loaded'}</dd>
      </dl>

      <dl className={styles.facts} aria-label="Diagnostics">
        <dt>Frame time p95</dt>
        <dd data-testid="frame-time">{session.diagnostics.frameTimeP95Ms === null ? '–' : `${session.diagnostics.frameTimeP95Ms.toFixed(2)} ms`}</dd>
        <dt>Audio underflows</dt>
        <dd>{session.diagnostics.audioUnderflows}</dd>
        <dt>Audio overflows</dt>
        <dd>{session.diagnostics.audioOverflows}</dd>
      </dl>
    </div>
  );
}
