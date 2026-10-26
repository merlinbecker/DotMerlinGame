import { useRef } from 'react';
import type { ViewInstanceProps } from '../../core/index.ts';
import { decodeObject, OBJECT_COUNT, objectHeight, type ObjectEntry } from '../../core/inspect/oam.ts';
import { decodeTile, drawTile, tileBytes } from '../../core/inspect/tiles.ts';
import { InspectNotice } from '../inspect-common/Notice.tsx';
import { Pager } from '../inspect-common/Pager.tsx';
import { RateBar } from '../inspect-common/RateBar.tsx';
import { TileCanvas } from '../inspect-common/TileCanvas.tsx';
import { useChanges } from '../inspect-common/useChanges.ts';
import { useFit } from '../inspect-common/useFit.ts';
import { useInspection } from '../inspect-common/useInspection.ts';
import common from '../inspect-common/Inspect.module.css';
import type { SpritesViewState } from './definition.ts';
import styles from './SpritesView.module.css';

// Offsets in InspectionSnapshot.io ($FF00 + n), Pan Docs "Hardware Registers".
const LCDC = 0x40;
const OBP0 = 0x48;
const OBP1 = 0x49;
/** CSS pixels per tile pixel in the list. */
const SCALE = 3;
/** Entries per page until the list has been measured (and in tests without layout). */
const FALLBACK_ROWS = 8;
const ENTRY_BYTES = 4;

const hex = (n: number) => `$${n.toString(16).toUpperCase().padStart(2, '0')}`;

/** The object's tile(s) as stored, 8 × 8 or 8 × 16, raw or through its palette. */
function objectPicture(vram: Uint8Array, entry: ObjectEntry, palette: number | null): Uint8Array {
  const picture = new Uint8Array(8 * entry.tiles.length * 8);
  entry.tiles.forEach((tile, i) => {
    drawTile(picture, 8, decodeTile(tileBytes(vram, tile)), 0, i * 8, palette);
  });
  return picture;
}

/** The 40 OAM entries with fields and tile picture (US5); paged, hidden entries named as such. */
export function SpritesView({ context, state, setState }: ViewInstanceProps<SpritesViewState>) {
  const { snapshot, inspection, session } = useInspection(context, state.rate);
  const box = useRef<HTMLDivElement>(null);
  const fit = useFit(box);
  const update = (patch: Partial<SpritesViewState>) => {
    setState({ ...state, ...patch });
  };

  const lcdc = inspection?.io[LCDC] ?? 0;
  const height = objectHeight(lcdc);
  const rowHeight = height * SCALE + 8;
  const perPage = fit.height > 0 ? Math.max(1, Math.floor(fit.height / rowHeight)) : FALLBACK_ROWS;
  const pages = Math.ceil(OBJECT_COUNT / perPage);
  const page = Math.min(state.page, pages - 1);
  const first = page * perPage;
  const count = Math.min(perPage, OBJECT_COUNT - first);
  const shownBytes = inspection ? inspection.oam.subarray(first * ENTRY_BYTES, (first + count) * ENTRY_BYTES) : null;
  const changed = useChanges(snapshot?.frame ?? null, `${String(first)}:${String(count)}`, shownBytes);

  return (
    <div className={styles.sprites} data-frame={snapshot?.frame ?? 0}>
      <div className={common.bar} role="group" aria-label="Palette">
        <button type="button" className={common.button} aria-pressed={state.palette === 'raw'} onClick={() => { update({ palette: 'raw' }); }}>
          Raw
        </button>
        <button type="button" className={common.button} aria-pressed={state.palette === 'obp'} onClick={() => { update({ palette: 'obp' }); }}>
          OBP
        </button>
        <span className={common.note}>8×{height}</span>
      </div>
      <div ref={box} className={styles.list}>
        {session.rom === null || !inspection ? (
          <InspectNotice romLoaded={session.rom !== null} />
        ) : (
          Array.from({ length: count }, (_, i) => {
            const entry = decodeObject(inspection.oam, first + i, lcdc);
            const palette = state.palette === 'obp' ? (inspection.io[entry.palette ? OBP1 : OBP0] ?? 0) : null;
            const isChanged = [0, 1, 2, 3].some((b) => changed.has(i * ENTRY_BYTES + b));
            return (
              <div key={entry.index} className={`${styles.entry} ${isChanged ? common.changed : ''}`} data-testid={`sprite-${String(entry.index)}`} data-changed={isChanged}>
                <TileCanvas pixels={objectPicture(inspection.vram, entry, palette)} width={8} height={height} scale={SCALE} label={`Sprite ${String(entry.index)} tile`} />
                <span className={common.mono}>
                  #{entry.index} Y {entry.y} X {entry.x} tile {hex(entry.tile)} · prio {entry.priority ? 1 : 0} · flip {entry.flipX ? 'X' : '–'}
                  {entry.flipY ? 'Y' : '–'} · OBP{entry.palette}
                  {entry.visible ? '' : ' · hidden'}
                </span>
              </div>
            );
          })
        )}
      </div>
      {inspection && pages > 1 && <Pager page={page} pages={pages} onPage={(next) => { update({ page: next }); }} />}
      <RateBar rate={state.rate} onChange={(rate) => { update({ rate }); }} />
    </div>
  );
}
