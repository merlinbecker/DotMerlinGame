import { useRef, useState, type SubmitEvent } from 'react';
import type { InspectionSnapshot, ViewInstanceProps } from '../../core/index.ts';
import { areaBanks, bytesOf, HEX_AREAS, type HexArea } from '../../core/inspect/areas.ts';
import { alignTop, bytesPerRow, type RowWidth } from '../../core/inspect/hex-layout.ts';
import { ioRegisterName } from '../../core/inspect/io-registers.ts';
import { InspectNotice } from '../inspect-common/Notice.tsx';
import { Pager } from '../inspect-common/Pager.tsx';
import { RateBar } from '../inspect-common/RateBar.tsx';
import { useChanges } from '../inspect-common/useChanges.ts';
import { useFit } from '../inspect-common/useFit.ts';
import { useInspection } from '../inspect-common/useInspection.ts';
import common from '../inspect-common/Inspect.module.css';
import type { HexViewState } from './definition.ts';
import styles from './HexView.module.css';

/** Rows per page until the slot has been measured (and in tests without layout). */
const FALLBACK_ROWS = 8;

const hex2 = (n: number) => n.toString(16).toUpperCase().padStart(2, '0');
const hex4 = (n: number) => `$${n.toString(16).toUpperCase().padStart(4, '0')}`;

/** Notes about what the bytes mean, per area (spec edge cases; research.md R3, R11). */
const AREA_NOTES: Partial<Record<HexArea, string>> = {
  io: 'Internal emulator values; unused bits may differ from what the CPU reads.',
  vram: 'Internal state, also while the LCD blocks CPU access.',
  oam: 'Internal state, also while the LCD blocks CPU access.',
  'cart-ram': 'Clock registers (MBC3) are not shown.',
};

function bankOf(state: HexViewState, area: HexArea, banks: number): number {
  const wanted = area === 'rom' ? state.romBank : area === 'cart-ram' ? state.ramBank : 0;
  return wanted < banks ? wanted : 0;
}

/** Bank mapped right now, for the "mapped" mark (text, never color). */
function mappedBank(area: HexArea, inspection: InspectionSnapshot): number | null {
  if (area === 'rom') return inspection.romBank;
  if (area === 'cart-ram') return inspection.cartRam?.bank ?? null;
  return null;
}

/** Bytes of the running game, read-only (US1). Paging instead of scrolling; the I/O area lists one register per row. */
export function HexView({ context, state, setState }: ViewInstanceProps<HexViewState>) {
  const { snapshot, inspection, session } = useInspection(context, state.rate);
  const rowsBox = useRef<HTMLDivElement>(null);
  const charProbe = useRef<HTMLSpanElement>(null);
  const fit = useFit(rowsBox);
  const [jump, setJump] = useState('');
  const update = (patch: Partial<HexViewState>) => {
    setState({ ...state, ...patch });
  };

  const area = state.area;
  const banks = inspection ? areaBanks(area, inspection) : 0;
  const bank = bankOf(state, area, banks);
  const view = inspection ? bytesOf(area, bank, inspection) : null;

  const listMode = area === 'io';
  const charWidth = (charProbe.current?.offsetWidth ?? 0) / 10;
  const rowWidth: RowWidth | 1 = listMode ? 1 : bytesPerRow(fit.width, charWidth);
  const rowHeight = charProbe.current?.offsetHeight ?? 0;
  const rows = rowHeight > 0 && fit.height > 0 ? Math.max(1, Math.floor(fit.height / rowHeight)) : FALLBACK_ROWS;
  const pageBytes = rows * rowWidth;
  const base = view?.base ?? 0;
  const size = view?.bytes.length ?? 0;
  const inArea = state.topAddress >= base && state.topAddress < base + size ? state.topAddress : base;
  const top = rowWidth === 1 ? inArea : alignTop(inArea, base, rowWidth);
  const shown = view ? view.bytes.subarray(top - base, top - base + pageBytes) : null;
  const changed = useChanges(snapshot?.frame ?? null, `${area}:${String(bank)}:${String(top)}:${String(pageBytes)}`, shown);

  const updates = useRef(0);
  const lastFrame = useRef<number | null>(null);
  if (snapshot && snapshot.frame !== lastFrame.current) {
    lastFrame.current = snapshot.frame;
    updates.current++;
  }

  const go = (event: SubmitEvent) => {
    event.preventDefault();
    const address = Number.parseInt(jump.replace(/^\$/, ''), 16);
    if (!Number.isInteger(address) || !view) return;
    const target = Math.min(Math.max(address, base), base + size - 1);
    update({ topAddress: rowWidth === 1 ? target : alignTop(target, base, rowWidth), selected: target });
  };

  const header = (
    <div className={common.bar}>
      <label className={styles.field}>
        <span>Area</span>
        <select
          aria-label="Area"
          className={common.button}
          value={area}
          onChange={(event) => {
            const next = HEX_AREAS.find((a) => a.id === event.target.value)?.id ?? area;
            const nextBase = inspection ? (bytesOf(next, 0, inspection)?.base ?? 0) : 0;
            update({ area: next, topAddress: nextBase, selected: null });
          }}
        >
          {HEX_AREAS.map((a) => (
            <option key={a.id} value={a.id} disabled={a.id === 'cart-ram' && inspection !== null && !inspection.cartRam}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      {banks > 1 && (
        <>
          <button type="button" className={common.button} disabled={bank === 0} onClick={() => { update(area === 'rom' ? { romBank: bank - 1 } : { ramBank: bank - 1 }); }}>
            Previous bank
          </button>
          <span data-testid="bank">
            Bank {bank} / {banks}
          </span>
          <button type="button" className={common.button} disabled={bank >= banks - 1} onClick={() => { update(area === 'rom' ? { romBank: bank + 1 } : { ramBank: bank + 1 }); }}>
            Next bank
          </button>
        </>
      )}
      {inspection && banks > 0 && mappedBank(area, inspection) === bank && <span className={styles.tag}>mapped</span>}
      {area === 'cart-ram' && inspection?.cartRam?.enabled === false && <span className={styles.tag}>locked</span>}
    </div>
  );

  return (
    <div className={styles.hex} data-frame={snapshot?.frame ?? 0} data-updates={updates.current} data-row-width={rowWidth}>
      {header}
      <form className={common.bar} onSubmit={go}>
        <input
          aria-label="Go to address"
          className={`${common.button} ${common.mono} ${styles.jump}`}
          value={jump}
          inputMode="text"
          autoCapitalize="characters"
          placeholder="C000"
          onChange={(event) => {
            setJump(event.target.value);
          }}
        />
        <button type="submit" className={common.button}>
          Go
        </button>
      </form>
      <div ref={rowsBox} className={styles.rows}>
        <span ref={charProbe} className={`${common.mono} ${styles.probe}`} aria-hidden="true">
          0000000000
        </span>
        {session.rom === null ? (
          <InspectNotice romLoaded={false} />
        ) : !inspection ? (
          <InspectNotice romLoaded />
        ) : !view ? (
          <p className={common.notice}>{area === 'cart-ram' ? 'This cartridge has no RAM.' : 'This bank does not exist.'}</p>
        ) : (
          Array.from({ length: Math.ceil((shown?.length ?? 0) / rowWidth) }, (_, r) => {
            const rowStart = top + r * rowWidth;
            const name = listMode ? ioRegisterName(rowStart) : null;
            return (
              <div key={rowStart} className={`${common.mono} ${styles.row}`} data-testid={`row-${hex4(rowStart)}`}>
                <span className={styles.address}>{hex4(rowStart)}</span>
                {Array.from({ length: Math.min(rowWidth, base + size - rowStart) }, (_, i) => {
                  const offset = r * rowWidth + i;
                  const address = rowStart + i;
                  const isChanged = changed.has(offset);
                  const isSelected = state.selected === address;
                  return (
                    <span
                      key={address}
                      data-testid="byte"
                      data-changed={isChanged}
                      data-selected={isSelected}
                      className={`${styles.byte} ${isChanged ? common.changed : ''} ${isSelected ? common.selected : ''}`}
                      onClick={() => { update({ selected: address }); }}
                    >
                      {hex2(shown?.[offset] ?? 0)}
                    </span>
                  );
                })}
                {name && <span className={styles.name}>{name}</span>}
              </div>
            );
          })
        )}
      </div>
      {view && size > pageBytes && (
        <Pager
          page={Math.floor((top - base) / pageBytes)}
          pages={Math.ceil(size / pageBytes)}
          onPage={(page) => {
            update({ topAddress: base + page * pageBytes });
          }}
        />
      )}
      {AREA_NOTES[area] && <p className={common.note}>{AREA_NOTES[area]}</p>}
      <RateBar rate={state.rate} onChange={(rate) => { update({ rate }); }} />
    </div>
  );
}
