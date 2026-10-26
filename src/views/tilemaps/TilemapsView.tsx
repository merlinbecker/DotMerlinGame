import { useMemo, useRef } from 'react';
import type { ViewInstanceProps } from '../../core/index.ts';
import { MAP_PIXELS, MAP_TILES, mapBase, mapPicture, tileIndexFor, viewport, windowEnabled, windowOrigin, type Rect } from '../../core/inspect/tilemap.ts';
import { InspectNotice } from '../inspect-common/Notice.tsx';
import { RateBar } from '../inspect-common/RateBar.tsx';
import { TileCanvas } from '../inspect-common/TileCanvas.tsx';
import { useFit } from '../inspect-common/useFit.ts';
import { useInspection } from '../inspect-common/useInspection.ts';
import common from '../inspect-common/Inspect.module.css';
import type { TilemapsViewState } from './definition.ts';
import styles from './TilemapsView.module.css';

// Offsets in InspectionSnapshot.io ($FF00 + n), Pan Docs "Hardware Registers".
const LCDC = 0x40;
const SCY = 0x42;
const SCX = 0x43;
const BGP = 0x47;
const WY = 0x4a;
const WX = 0x4b;
const SCREEN_WIDTH = 160;
const SCREEN_HEIGHT = 144;

const hex = (n: number, digits: number) => n.toString(16).toUpperCase().padStart(digits, '0');

/** Background or window map as the LCD settings select it, with the visible area framed (US4). */
export function TilemapsView({ context, state, setState }: ViewInstanceProps<TilemapsViewState>) {
  const { snapshot, inspection, session } = useInspection(context, state.rate);
  const box = useRef<HTMLDivElement>(null);
  const fit = useFit(box);
  const update = (patch: Partial<TilemapsViewState>) => {
    setState({ ...state, ...patch });
  };

  const io = inspection?.io;
  const lcdc = io?.[LCDC] ?? 0;
  const palette = io && state.palette === 'bgp' ? (io[BGP] ?? 0) : null;
  const picture = useMemo(() => (inspection ? mapPicture(inspection.vram, lcdc, state.map, palette) : null), [inspection, lcdc, state.map, palette]);
  const origin = windowOrigin(io?.[WX] ?? 0, io?.[WY] ?? 0);
  const rects: Rect[] = useMemo(() => {
    if (!io) return [];
    if (state.map === 'background') return viewport(io[SCX] ?? 0, io[SCY] ?? 0);
    // The part of the window map that is on screen, from its top left corner.
    const width = Math.min(MAP_PIXELS, SCREEN_WIDTH - Math.max(0, origin.x));
    const height = Math.min(MAP_PIXELS, SCREEN_HEIGHT - origin.y);
    return width > 0 && height > 0 ? [{ x: 0, y: 0, width, height }] : [];
  }, [io, state.map, origin.x, origin.y]);

  const side = Math.min(fit.width, fit.height);
  // Integer zoom when there is room; smaller slots get the whole map scaled down, the zoom button shows it full size.
  const scale = side >= MAP_PIXELS ? Math.floor(side / MAP_PIXELS) : side > 0 ? side / MAP_PIXELS : 1;
  const base = mapBase(lcdc, state.map);
  const selected = state.selected;

  return (
    <div className={styles.tilemaps} data-frame={snapshot?.frame ?? 0}>
      <div className={common.bar}>
        <div className={common.bar} role="group" aria-label="Map">
          <button type="button" className={common.button} aria-pressed={state.map === 'background'} onClick={() => { update({ map: 'background', selected: null }); }}>
            Background
          </button>
          <button type="button" className={common.button} aria-pressed={state.map === 'window'} onClick={() => { update({ map: 'window', selected: null }); }}>
            Window
          </button>
        </div>
        <div className={common.bar} role="group" aria-label="Palette">
          <button type="button" className={common.button} aria-pressed={state.palette === 'raw'} onClick={() => { update({ palette: 'raw' }); }}>
            Raw
          </button>
          <button type="button" className={common.button} aria-pressed={state.palette === 'bgp'} onClick={() => { update({ palette: 'bgp' }); }}>
            BGP
          </button>
        </div>
      </div>
      <div ref={box} className={styles.map}>
        {session.rom === null || !inspection || !picture ? (
          <InspectNotice romLoaded={session.rom !== null} />
        ) : (
          <TileCanvas
            pixels={picture}
            width={MAP_PIXELS}
            height={MAP_PIXELS}
            scale={scale}
            rects={rects}
            label={state.map === 'background' ? 'Background map' : 'Window map'}
            frame={snapshot?.frame}
            onTap={(x, y) => {
              update({ selected: Math.floor(y / 8) * MAP_TILES + Math.floor(x / 8) });
            }}
          />
        )}
      </div>
      {inspection && (
        <p className={`${common.note} ${common.mono}`} data-testid="map-info">
          ${hex(base, 4)}
          {state.map === 'background' ? ` · SCX ${String(io?.[SCX] ?? 0)} SCY ${String(io?.[SCY] ?? 0)}` : windowEnabled(lcdc) ? ` · Window at (${String(origin.x)}, ${String(origin.y)})` : ' · Window off'}
          {scale < 1 && ' · Zoom for full size'}
        </p>
      )}
      {inspection && selected !== null && (
        <p className={`${common.note} ${common.mono}`} data-testid="map-detail">
          Map ({selected % MAP_TILES}, {Math.floor(selected / MAP_TILES)}) · ${hex(base + selected, 4)} · tile {tileIndexFor(inspection.vram[base - 0x8000 + selected] ?? 0, lcdc)}
        </p>
      )}
      <RateBar rate={state.rate} onChange={(rate) => { update({ rate }); }} />
    </div>
  );
}
