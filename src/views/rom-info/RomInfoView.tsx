import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { SessionState, ViewAction, ViewInstanceProps } from '../../core/index.ts';
import { cartridgeName, formatSize } from './cartridge-name.ts';
import { ROM_INFO_PAGES, type RomInfoPage, type RomInfoState } from './definition.ts';
import { noticeText } from './notice-text.ts';
import styles from './RomInfoView.module.css';

const VOLUME_STEP = 0.1;
const PAGE_LABEL: Record<RomInfoPage, string> = { rom: 'ROM', start: 'Start', sound: 'Sound', header: 'Header' };

interface PendingFile {
  readonly bytes: Uint8Array;
  readonly fileName: string;
}

type Dispatch = (action: ViewAction) => void;

interface RomPageProps {
  readonly session: SessionState;
  readonly dispatch: Dispatch;
  readonly pending: PendingFile | null;
  readonly onPick: () => void;
  readonly onReplace: () => void;
  readonly onCancel: () => void;
}

function RomPage({ session, dispatch, pending, onPick, onReplace, onCancel }: RomPageProps) {
  if (pending) {
    return (
      <div className={styles.confirm} role="alertdialog" aria-label="Replace stored ROM">
        <p>Loading a new ROM replaces the stored ROM. Its save game will be lost; the ROM file itself stays on your device.</p>
        <div className={styles.row}>
          <button type="button" className={styles.button} onClick={onReplace}>
            Replace
          </button>
          <button type="button" className={styles.button} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className={styles.row}>
        <button type="button" className={styles.button} onClick={onPick}>
          Load ROM
        </button>
        {session.runState === 'empty' && session.storedRomAvailable && (
          <button type="button" className={styles.button} onClick={() => { dispatch({ type: 'StartStoredRom' }); }}>
            Start stored ROM
          </button>
        )}
        {session.runState === 'running' && (
          <button type="button" className={styles.button} onClick={() => { dispatch({ type: 'Pause' }); }}>
            Pause
          </button>
        )}
        {session.runState === 'paused' && (
          <button type="button" className={styles.button} onClick={() => { dispatch({ type: 'Resume' }); }}>
            Resume
          </button>
        )}
        {session.runState !== 'empty' && (
          <button type="button" className={styles.button} onClick={() => { dispatch({ type: 'Reset' }); }}>
            Reset
          </button>
        )}
      </div>
      {session.notice?.kind === 'audio-locked' ? (
        <button type="button" className={styles.button} onClick={() => { dispatch({ type: 'UnlockAudio' }); }}>
          Enable sound
        </button>
      ) : (
        session.notice && (
          <p className={styles.notice} role="status">
            {noticeText(session.notice)}
          </p>
        )
      )}
      <dl className={styles.facts}>
        <dt>State</dt>
        <dd data-testid="run-state">{session.runState}</dd>
        <dt>File</dt>
        <dd className={styles.ellipsis}>{session.fileName ?? 'No ROM loaded'}</dd>
        <dt>Controller</dt>
        <dd className={styles.ellipsis} data-testid="gamepads">
          {session.gamepads.length > 0 ? session.gamepads.join(', ') : 'none – press a button on it to connect'}
        </dd>
      </dl>
    </>
  );
}

function StartPage({ session, dispatch }: { readonly session: SessionState; readonly dispatch: Dispatch }) {
  return (
    <>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          aria-pressed={session.settings.bootMode === 'own-boot-rom'}
          onClick={() => { dispatch({ type: 'SetBootMode', bootMode: 'own-boot-rom' }); }}
        >
          Own boot ROM
        </button>
        <button
          type="button"
          className={styles.button}
          aria-pressed={session.settings.bootMode === 'direct-start'}
          onClick={() => { dispatch({ type: 'SetBootMode', bootMode: 'direct-start' }); }}
        >
          Direct start
        </button>
        <button
          type="button"
          className={styles.button}
          aria-pressed={session.settings.hardwareChecks}
          onClick={() => { dispatch({ type: 'SetHardwareChecks', enabled: !session.settings.hardwareChecks }); }}
        >
          Hardware-near checks
        </button>
      </div>
      <p className={styles.hint}>Takes effect on the next start or reset.</p>
    </>
  );
}

function SoundPage({ session, dispatch }: { readonly session: SessionState; readonly dispatch: Dispatch }) {
  return (
    <>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          aria-label="Volume down"
          onClick={() => { dispatch({ type: 'SetVolume', volume: Math.max(0, session.audio.volume - VOLUME_STEP) }); }}
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
          onClick={() => { dispatch({ type: 'SetVolume', volume: Math.min(1, session.audio.volume + VOLUME_STEP) }); }}
        >
          +
        </button>
      </div>
      {session.audio.unlocked ? (
        <p className={styles.hint}>Mute is in the screen header.</p>
      ) : (
        <button type="button" className={styles.button} onClick={() => { dispatch({ type: 'UnlockAudio' }); }}>
          Enable sound
        </button>
      )}
    </>
  );
}

function HeaderPage({ session }: { readonly session: SessionState }) {
  const rom = session.rom;
  return (
    <>
      {rom ? (
        <dl className={styles.facts} aria-label="Cartridge header" data-testid="rom-header">
          <dt>Title</dt>
          <dd className={styles.ellipsis}>{rom.title || '–'}</dd>
          <dt>Type</dt>
          <dd>
            {cartridgeName(rom.cartridgeType)} (${rom.cartridgeType.code.toString(16).toUpperCase().padStart(2, '0')})
          </dd>
          <dt>ROM</dt>
          <dd>
            {formatSize(rom.romSizeBytes)}, {rom.romBanks} banks
          </dd>
          <dt>RAM</dt>
          <dd>{formatSize(rom.ramSizeBytes)}</dd>
          <dt>Battery</dt>
          <dd>{rom.cartridgeType.battery ? 'yes' : 'no'}</dd>
        </dl>
      ) : (
        <p className={styles.hint}>No ROM loaded.</p>
      )}
      <dl className={styles.facts} aria-label="Diagnostics">
        <dt>Frame time p95</dt>
        <dd data-testid="frame-time">{session.diagnostics.frameTimeP95Ms === null ? '–' : `${session.diagnostics.frameTimeP95Ms.toFixed(2)} ms`}</dd>
        <dt>Audio underflows</dt>
        <dd>{session.diagnostics.audioUnderflows}</dd>
        <dt>Audio overflows</dt>
        <dd>{session.diagnostics.audioOverflows}</dd>
      </dl>
    </>
  );
}

/** Loads ROMs and shows the session on pages (no scrolling); all changes go through dispatch (FR-027). */
export function RomInfoView({ context, state, setState }: ViewInstanceProps<RomInfoState>) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingFile | null>(null);
  const session = useSyncExternalStore(
    (onChange) => context.session.subscribe(onChange),
    () => context.session.getSnapshot(),
  );
  const hasStoredRom = session.storedRomAvailable || session.rom !== null;
  const dispatch: Dispatch = (action) => {
    context.dispatch(action);
  };
  const showPage = (page: RomInfoPage) => {
    if (page !== state.page) setState({ page });
  };

  // A new notice (rejected ROM, halt, full storage) is shown on the ROM page.
  const notice = session.notice;
  useEffect(() => {
    if (notice && notice.kind !== 'audio-locked') showPage('rom');
  }, [notice]); // only when the notice changes, not when the user turns the page

  const load = (file: PendingFile) => {
    setPending(null);
    dispatch({ type: 'LoadRom', bytes: file.bytes, fileName: file.fileName });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const picked = { bytes: new Uint8Array(await file.arrayBuffer()), fileName: file.name };
    if (input.current) input.current.value = '';
    showPage('rom');
    if (hasStoredRom) setPending(picked);
    else load(picked);
  };

  return (
    <div className={styles.info}>
      <div className={styles.tabs} role="group" aria-label="Pages">
        {ROM_INFO_PAGES.map((page) => (
          <button key={page} type="button" className={styles.tab} aria-pressed={state.page === page} onClick={() => { showPage(page); }}>
            {PAGE_LABEL[page]}
          </button>
        ))}
      </div>
      <div className={styles.page}>
        {state.page === 'rom' && (
          <RomPage
            session={session}
            dispatch={dispatch}
            pending={pending}
            onPick={() => input.current?.click()}
            onReplace={() => {
              if (pending) load(pending);
            }}
            onCancel={() => {
              setPending(null);
            }}
          />
        )}
        {state.page === 'start' && <StartPage session={session} dispatch={dispatch} />}
        {state.page === 'sound' && <SoundPage session={session} dispatch={dispatch} />}
        {state.page === 'header' && <HeaderPage session={session} />}
      </div>
      <input
        ref={input}
        className={styles.file}
        type="file"
        accept=".gb,.bin,application/octet-stream"
        data-testid="rom-file"
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
    </div>
  );
}
