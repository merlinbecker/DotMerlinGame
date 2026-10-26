import { useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { LayoutState } from '../../core/index.ts';
import { ServicesContext } from '../services.ts';
import { findView } from '../views/registry.ts';
import { createFrameDemand } from './frame-demand.ts';
import { computeGrid, type GridSpec } from './grid.ts';
import { loadLayout, VIEW_CYCLE_ORDER, saveLayout, withViewState } from './layout-store.ts';
import { isSlotShown, toggleMaximize } from './layout-zoom.ts';
import { Slot } from './Slot.tsx';
import { useDocumentVisible } from './useDocumentVisible.ts';
import { cycleView } from './view-cycle.ts';
import styles from './Grid.module.css';

const FALLBACK_MIN_SLOT_SIZE = 320;

function readMinSlotSize(): number {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slot-min-size'));
  return Number.isFinite(value) && value > 0 ? value : FALLBACK_MIN_SLOT_SIZE;
}

interface Measured extends GridSpec {
  /** Side of the largest square that fits the grid area (used by a maximized slot). */
  readonly fullSize: number;
}

function measure(element: HTMLElement | null): Measured {
  if (!element) return { columns: 1, rows: 2, slotSize: 0, fullSize: 0 };
  const width = element.clientWidth;
  const height = element.clientHeight;
  return { ...computeGrid({ width, height }, readMinSlotSize()), fullSize: Math.floor(Math.min(width, height)) };
}

/** Raster of square slots. Holds only the layout (which view in which slot), never emulator state. */
export function Grid() {
  const services = useContext(ServicesContext);
  const container = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState<Measured>({ columns: 1, rows: 2, slotSize: 0, fullSize: 0 });
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
    const order = VIEW_CYCLE_ORDER.filter((id) => findView(id));
    const next = cycleView(current, order, direction);
    const view = next ? findView(next) : undefined;
    if (!view) return;
    const slots = layout.slots.map((slot, i) => (i === index ? { viewTypeId: view.definition.typeId, viewState: view.definition.serialize(view.definition.initialState) } : slot));
    update({ ...layout, slots });
  };

  const maximized = layout.maximizedSlot !== null;
  const slotSize = maximized ? grid.fullSize : grid.slotSize;
  const style = {
    '--grid-columns': String(maximized ? 1 : grid.columns),
    '--slot-size': `${slotSize}px`,
  } as CSSProperties;

  return (
    <div ref={container} className={styles.container}>
      <div className={styles.grid} style={style}>
        {layout.slots.map((slot, index) => {
          const shown = isSlotShown(layout, index);
          return (
            <Slot
              key={index}
              content={slot}
              shown={shown}
              visible={shown && documentVisible}
              size={slotSize}
              maximized={layout.maximizedSlot === index}
              onToggleMaximize={() => {
                update(toggleMaximize(layout, index));
              }}
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
