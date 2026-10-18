import { useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { MEMORY_MAP, type ViewInstanceProps } from '../../core/index.ts';
import type { MemoryMapState } from './definition.ts';
import styles from './MemoryMapView.module.css';

/** Rows per page before the first measurement. */
const INITIAL_ROWS = 4;

/** How many rows fit into the list area; measured, so the pager below is never cut off (Constitution V). */
function useRowsPerPage(list: RefObject<HTMLOListElement | null>): number {
  const [rows, setRows] = useState(INITIAL_ROWS);
  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    const measure = () => {
      const row = element.firstElementChild as HTMLElement | null;
      if (!row) return;
      const gap = parseFloat(getComputedStyle(element).rowGap) || 0;
      const fit = Math.floor((element.clientHeight + gap) / (row.offsetHeight + gap));
      setRows(Math.max(1, fit));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [list]);
  return rows;
}

const hex = (n: number) => `$${n.toString(16).toUpperCase().padStart(4, '0')}`;

/** Static DMG address space with the ROM banks of the loaded cartridge (FR-025); no live memory. */
export function MemoryMapView({ context, state, setState }: ViewInstanceProps<MemoryMapState>) {
  const session = useSyncExternalStore(
    (onChange) => context.session.subscribe(onChange),
    () => context.session.getSnapshot(),
  );
  const list = useRef<HTMLOListElement>(null);
  const perPage = useRowsPerPage(list);
  const pages = Math.ceil(MEMORY_MAP.length / perPage);
  const page = Math.min(state.page, pages - 1);
  const rows = MEMORY_MAP.slice(page * perPage, (page + 1) * perPage);
  const banks = session.rom?.romBanks;

  return (
    <div className={styles.map}>
      <ol ref={list} className={styles.list}>
        {rows.map((region) => (
          <li key={region.start} className={styles.region} data-kind={region.kind}>
            <span className={styles.range}>
              {hex(region.start)}–{hex(region.end)}
            </span>
            <span className={styles.name}>
              {region.kind === 'rom-banked' && banks !== undefined
                ? banks > 2
                  ? `ROM bank 1–${banks - 1} (switchable, ${banks - 1} banks)`
                  : 'ROM bank 1 (no switching)'
                : region.name}
            </span>
          </li>
        ))}
      </ol>
      {pages > 1 && (
        <div className={styles.pager}>
          <button type="button" className={styles.button} disabled={page === 0} onClick={() => { setState({ page: page - 1 }); }}>
            Previous page
          </button>
          <span>
            {page + 1} / {pages}
          </span>
          <button type="button" className={styles.button} disabled={page >= pages - 1} onClick={() => { setState({ page: page + 1 }); }}>
            Next page
          </button>
        </div>
      )}
      <p className={styles.legend}>{banks === undefined ? 'No ROM loaded: bank count unknown.' : `Loaded ROM: ${banks} banks of 16 KiB.`}</p>
    </div>
  );
}
