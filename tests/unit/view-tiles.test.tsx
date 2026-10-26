import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { blockPicture, decodeTile } from '../../src/core/inspect/tiles.ts';
import { applyPalette } from '../../src/core/inspect/palette.ts';
import { TilesView } from '../../src/views/tiles/TilesView.tsx';
import { INITIAL_TILES_STATE, tilesDefinition } from '../../src/views/tiles/definition.ts';
import { expectOnlyInspectActions } from '../support/dispatch-spy.ts';
import { fixtureSnapshots } from '../support/inspection-fixtures.ts';
import { renderView } from '../support/render-view.tsx';

afterEach(cleanup);

const [gfx] = fixtureSnapshots('inspect-gfx');
if (!gfx?.inspection) throw new Error('fixture missing');
const vram = gfx.inspection.vram;

/** Expected bytes of tile T per tests/roms/src/inspect-gfx.asm: row R = [T & $FF, R*$10 | T >> 8]. */
function expectedTile(tile: number): Uint8Array {
  return Uint8Array.from({ length: 16 }, (_, i) => (i % 2 === 0 ? tile & 0xff : (Math.floor(i / 2) << 4) | (tile >> 8)));
}

/** Pixels of a tile inside its block picture. */
function tileFromBlock(picture: Uint8Array, indexInBlock: number): number[] {
  const x0 = (indexInBlock % 16) * 8;
  const y0 = Math.floor(indexInBlock / 16) * 8;
  return Array.from({ length: 64 }, (_, i) => picture[(y0 + Math.floor(i / 8)) * 128 + x0 + (i % 8)] ?? -1);
}

describe('Tiles view (US3)', () => {
  it('starts raw at one update per second (Clarification Q5)', () => {
    expect(tilesDefinition.initialState).toEqual({ rate: 'second', palette: 'raw', page: 0, selected: null });
    expect(tilesDefinition.deserialize(tilesDefinition.serialize({ ...INITIAL_TILES_STATE, palette: 'bgp', selected: 383 }))).toEqual({ ...INITIAL_TILES_STATE, palette: 'bgp', selected: 383 });
  });

  it.each([0, 200, 383])('draws tile %i pixel for pixel as the test ROM wrote it (SC-001)', (tile) => {
    const block = Math.floor(tile / 128) as 0 | 1 | 2;
    expect(tileFromBlock(blockPicture(vram, block, null), tile % 128)).toEqual([...decodeTile(expectedTile(tile))]);
    const bgp = gfx.inspection?.io[0x47] ?? 0;
    expect(tileFromBlock(blockPicture(vram, block, bgp), tile % 128)).toEqual([...decodeTile(expectedTile(tile))].map((i) => applyPalette(i as 0, bgp)));
  });

  it('shows the three blocks of 128 tiles, paged when the slot is small (US3-AS1)', async () => {
    await renderView(TilesView, INITIAL_TILES_STATE, gfx);
    expect(screen.getByText(/\$8000–\$87FF · tiles 0–127/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText(/\$8800–\$8FFF · tiles 128–255/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText(/\$9000–\$97FF · tiles 256–383/)).toBeTruthy();
  });

  it('shows number, address and bytes of a tapped tile (US3-AS2)', async () => {
    const view = await renderView(TilesView, { ...INITIAL_TILES_STATE, page: 1 }, gfx);
    // tile 200 is in block 1 at index 72: column 8, row 4; the canvas in tests has scale 2
    fireEvent.click(screen.getByRole('img', { name: 'Tiles 128 to 255' }), { clientX: 8 * 8 * 2 + 1, clientY: 4 * 8 * 2 + 1 });
    expect(screen.getByTestId('tile-detail').textContent).toBe('Tile 200 · $8C80 · C8 00 C8 10 C8 20 C8 30 C8 40 C8 50 C8 60 C8 70');
    expectOnlyInspectActions(view.actions);
  });

  it('switches between raw values and BGP (US3-AS3)', async () => {
    const view = await renderView(TilesView, INITIAL_TILES_STATE, gfx);
    fireEvent.click(screen.getByRole('button', { name: 'BGP' }));
    expect(view.states.at(-1)?.palette).toBe('bgp');
    expect(screen.getByRole('button', { name: 'BGP' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('says "No ROM loaded" without a ROM', async () => {
    await renderView(TilesView, INITIAL_TILES_STATE, null);
    expect(screen.getByText('No ROM loaded')).toBeTruthy();
  });
});
