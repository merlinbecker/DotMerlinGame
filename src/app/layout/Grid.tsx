import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { LayoutState } from '../../core/index.ts';
import { computeGrid, type GridSpec } from './grid.ts';
import { Slot } from './Slot.tsx';
import styles from './Grid.module.css';

const FALLBACK_MIN_SLOT_SIZE = 320;

function readMinSlotSize(): number {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slot-min-size'));
  return Number.isFinite(value) && value > 0 ? value : FALLBACK_MIN_SLOT_SIZE;
}

function measure(element: HTMLElement | null): GridSpec {
  if (!element) return { columns: 1, rows: 2, slotSize: 0 };
  return computeGrid({ width: element.clientWidth, height: element.clientHeight }, readMinSlotSize());
}

/** Layout with only empty slots; views are assigned from M1 on. */
function emptyLayout(slotCount: number): LayoutState {
  return { version: 1, slots: Array.from({ length: slotCount }, () => null) };
}

/** Raster of square slots. Layout only; no project or emulator state lives here. */
export function Grid() {
  const container = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState<GridSpec>({ columns: 1, rows: 2, slotSize: 0 });

  useEffect(() => {
    const element = container.current;
    const update = () => {
      setGrid(measure(element));
    };
    update();
    const observer = new ResizeObserver(update);
    if (element) observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const layout = emptyLayout(grid.columns * grid.rows);
  const style = {
    '--grid-columns': String(grid.columns),
    '--slot-size': `${grid.slotSize}px`,
  } as CSSProperties;

  return (
    <div ref={container} className={styles.container}>
      <div className={styles.grid} style={style}>
        {layout.slots.map((slot, index) => (
          <Slot key={index} title={slot ? slot.viewTypeId : 'Empty'} />
        ))}
      </div>
    </div>
  );
}
