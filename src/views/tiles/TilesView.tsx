import { useMemo, useRef } from 'react';
import type { ViewInstanceProps } from '../../core/index.ts';
import { BLOCK_TILES_HIGH, BLOCK_TILES_WIDE, BLOCKS, blockPicture, tileAddress, tileBytes } from '../../core/inspect/tiles.ts';
import { InspectNotice } from '../inspect-common/Notice.tsx';
import { Pager } from '../inspect-common/Pager.tsx';
import { RateBar } from '../inspect-common/RateBar.tsx';
import { TileCanvas } from '../inspect-common/TileCanvas.tsx';
import { readTokenPx } from '../inspect-common/tokens.ts';
import { useFit } from '../inspect-common/useFit.ts';
import { useInspection } from '../inspect-common/useInspection.ts';
import common from '../inspect-common/Inspect.module.css';
import type { TilesViewState } from './definition.ts';
import styles from './TilesView.module.css';

const BLOCK_WIDTH = BLOCK_TILES_WIDE * 8;
const BLOCK_HEIGHT = BLOCK_TILES_HIGH * 8;
/** Room for the label line above each block until real text metrics are known. */
const LABEL_SPACE = 24;
/** I/O offset of BGP ($FF47) in InspectionSnapshot.io. */
const BGP = 0x47;

const hex = (n: number, digits: number) => n.toString(16).toUpperCase().padStart(digits, '0');

/** All 384 tiles of VRAM in three blocks (US3); on one page if they fit at the minimum pixel size, else one block per page. */
export function TilesView({ context, state, setState }: ViewInstanceProps<TilesViewState>) {
  const { snapshot, inspection, session } = useInspection(context, state.rate);
  const box = useRef<HTMLDivElement>(null);
  const fit = useFit(box);
  const minPixel = useMemo(() => readTokenPx('--tile-pixel-min', 2), []);
  const update = (patch: Partial<TilesViewState>) => {
    setState({ ...state, ...patch });
  };

  const allScale = Math.floor(Math.min(fit.width / BLOCK_WIDTH, (fit.height - 3 * LABEL_SPACE) / (3 * BLOCK_HEIGHT)));
  const onePage = allScale >= minPixel;
  const scale = onePage ? allScale : Math.max(minPixel, Math.floor(Math.min(fit.width / BLOCK_WIDTH, (fit.height - LABEL_SPACE) / BLOCK_HEIGHT)));
  const page = onePage ? 0 : Math.min(state.page, BLOCKS.length - 1);
  const blocks = onePage ? BLOCKS : BLOCKS.slice(page, page + 1);
  const palette = inspection && state.palette === 'bgp' ? (inspection.io[BGP] ?? 0) : null;

  const pictures = useMemo(() => (inspection ? BLOCKS.map((b) => blockPicture(inspection.vram, b.index, palette)) : []), [inspection, palette]);
  const selected = state.selected;

  return (
    <div className={styles.tiles} data-frame={snapshot?.frame ?? 0}>
      <div className={common.bar} role="group" aria-label="Palette">
        <button type="button" className={common.button} aria-pressed={state.palette === 'raw'} onClick={() => { update({ palette: 'raw' }); }}>
          Raw
        </button>
        <button type="button" className={common.button} aria-pressed={state.palette === 'bgp'} onClick={() => { update({ palette: 'bgp' }); }}>
          BGP
        </button>
      </div>
      <div ref={box} className={styles.blocks}>
        {session.rom === null || !inspection ? (
          <InspectNotice romLoaded={session.rom !== null} />
        ) : (
          blocks.map((block) => (
            <figure key={block.index} className={styles.block}>
              <figcaption className={common.note}>
                ${hex(block.address, 4)}–${hex(block.address + 0x7ff, 4)} · tiles {block.first}–{block.first + 127}
              </figcaption>
              <TileCanvas
                pixels={pictures[block.index] ?? new Uint8Array(BLOCK_WIDTH * BLOCK_HEIGHT)}
                width={BLOCK_WIDTH}
                height={BLOCK_HEIGHT}
                scale={scale}
                label={`Tiles ${String(block.first)} to ${String(block.first + 127)}`}
                frame={snapshot?.frame}
                onTap={(x, y) => {
                  update({ selected: block.first + Math.floor(y / 8) * BLOCK_TILES_WIDE + Math.floor(x / 8) });
                }}
              />
            </figure>
          ))
        )}
      </div>
      {!onePage && inspection && <Pager page={page} pages={BLOCKS.length} onPage={(next) => { update({ page: next }); }} />}
      {inspection && selected !== null && (
        <p className={`${common.note} ${common.mono}`} data-testid="tile-detail">
          Tile {selected} · ${hex(tileAddress(selected), 4)} · {[...tileBytes(inspection.vram, selected)].map((b) => hex(b, 2)).join(' ')}
        </p>
      )}
      <RateBar rate={state.rate} onChange={(rate) => { update({ rate }); }} />
    </div>
  );
}
