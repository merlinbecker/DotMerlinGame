import { useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { LayoutState } from '../../core/index.ts';
import { ServicesContext } from '../services.ts';
import { findView } from '../views/registry.ts';
import { createFrameDemand } from './frame-demand.ts';
import { computeGrid, type GridSpec } from './grid.ts';
import { DEFAULT_VIEW_ORDER, loadLayout, saveLayout, withViewState } from './layout-store.ts';
import { Slot } from './Slot.tsx';
import { useDocumentVisible } from './useDocumentVisible.ts';
import { cycleView } from './view-cycle.ts';
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

/** Raster of square slots. Holds only the layout (which view in which slot), never emulator state. */
export function Grid() {
  const services = useContext(ServicesContext);
  const container = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState<GridSpec>({ columns: 1, rows: 2, slotSize: 0 });
  const slotCount = grid.columns * grid.rows;
  const [layout, setLayout] = useState<LayoutState>(() => loadLayout(slotCount));
  const demand = useMemo(() => createFrameDemand(services.frameState), [services]);
  const documentVisible = useDocumentVisible();

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

  useEffect(() => {
    // Every change is saved immediately, so storage holds the current layout (or none: defaults).
    setLayout((current) => (current.slots.length === slotCount ? current : loadLayout(slotCount)));
  }, [slotCount]);

  const update = (next: LayoutState) => {
    setLayout(next);
    saveLayout(next);
  };

  const cycle = (index: number, direction: 1 | -1) => {
    const current = layout.slots[index]?.viewTypeId ?? null;
    const order = DEFAULT_VIEW_ORDER.filter((id) => findView(id));
    const next = cycleView(current, order, direction);
    const view = next ? findView(next) : undefined;
    if (!view) return;
    const slots = layout.slots.map((slot, i) => (i === index ? { viewTypeId: view.definition.typeId, viewState: view.definition.serialize(view.definition.initialState) } : slot));
    update({ ...layout, slots });
  };

  const style = {
    '--grid-columns': String(grid.columns),
    '--slot-size': `${grid.slotSize}px`,
  } as CSSProperties;

  return (
    <div ref={container} className={styles.container}>
      <div className={styles.grid} style={style}>
        {layout.slots.map((slot, index) => {
          const shown = layout.maximizedSlot === null || layout.maximizedSlot === index;
          return (
            <Slot
              key={index}
              content={slot}
              shown={shown}
              visible={shown && documentVisible}
              size={grid.slotSize}
              demand={demand}
              onCycle={(direction) => {
                cycle(index, direction);
              }}
              onViewStateChange={(viewState) => {
                update(withViewState(layout, index, viewState));
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
