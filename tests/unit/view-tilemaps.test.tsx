import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { decodeTile } from '../../src/core/inspect/tiles.ts';
import { mapPicture, tileIndexFor } from '../../src/core/inspect/tilemap.ts';
import { TilemapsView } from '../../src/views/tilemaps/TilemapsView.tsx';
import { INITIAL_TILEMAPS_STATE, tilemapsDefinition } from '../../src/views/tilemaps/definition.ts';
import { expectOnlyInspectActions } from '../support/dispatch-spy.ts';
import { fixtureSnapshots } from '../support/inspection-fixtures.ts';
import { renderView } from '../support/render-view.tsx';

afterEach(cleanup);

const [gfx] = fixtureSnapshots('inspect-gfx');
const [tall] = fixtureSnapshots('inspect-gfx-tall');
if (!gfx?.inspection || !tall?.inspection) throw new Error('fixture missing');

/** Expected bytes of tile T per tests/roms/src/inspect-gfx.asm. */
const expectedTile = (tile: number) => Uint8Array.from({ length: 16 }, (_, i) => (i % 2 === 0 ? tile & 0xff : (Math.floor(i / 2) << 4) | (tile >> 8)));

function cell(picture: Uint8Array, column: number, row: number): number[] {
  return Array.from({ length: 64 }, (_, i) => picture[(row * 8 + Math.floor(i / 8)) * 256 + column * 8 + (i % 8)] ?? -1);
}

describe('Tilemaps view (US4)', () => {
  it('starts with the raw background map at one update per second', () => {
    expect(tilemapsDefinition.initialState).toEqual({ rate: 'second', palette: 'raw', map: 'background', selected: null });
  });

  it.each([
    ['inspect-gfx', 'background', 5, 7],
    ['inspect-gfx', 'window', 3, 1],
    ['inspect-gfx-tall', 'background', 31, 31],
  ] as const)('%s: the %s map matches the ROM cell (%i, %i) pixel for pixel (US4-AS1)', (name, kind, column, row) => {
    const data = fixtureSnapshots(name)[0]?.inspection;
    if (!data) throw new Error('fixture missing');
    const lcdc = data.io[0x40] ?? 0;
    const entry = column + row * 32;
    // BG map entry = low byte of its index, window entry inverted (inspect-gfx.asm)
    const value = kind === 'background' ? entry & 0xff : (entry & 0xff) ^ 0xff;
    expect(cell(mapPicture(data.vram, lcdc, kind, null), column, row)).toEqual([...decodeTile(expectedTile(tileIndexFor(value, lcdc)))]);
  });

  it('frames the visible screen area at SCX/SCY and names the window position (US4-AS2, AS3)', async () => {
    const view = await renderView(TilemapsView, INITIAL_TILEMAPS_STATE, gfx);
    expect(screen.getByTestId('map-info').textContent).toContain('$9800 · SCX 100 SCY 200');
    fireEvent.click(screen.getByRole('button', { name: 'Window' }));
    expect(screen.getByTestId('map-info').textContent).toContain('$9C00 · Window at (80, 40)');
    expectOnlyInspectActions(view.actions);
  });

  it('says when the window is off', async () => {
    const io = gfx.inspection?.io.slice() ?? new Uint8Array(0x80);
    io[0x40] = (io[0x40] ?? 0) & ~0x20;
    const off = { ...gfx, inspection: gfx.inspection && { ...gfx.inspection, io } };
    await renderView(TilemapsView, { ...INITIAL_TILEMAPS_STATE, map: 'window' }, off);
    expect(screen.getByTestId('map-info').textContent).toContain('Window off');
  });

  it('shows map position, address and tile of a tapped entry (US4-AS4)', async () => {
    await renderView(TilemapsView, INITIAL_TILEMAPS_STATE, gfx);
    // scale 1 in tests: entry (5, 7)
    fireEvent.click(screen.getByRole('img', { name: 'Background map' }), { clientX: 5 * 8 + 1, clientY: 7 * 8 + 1 });
    expect(screen.getByTestId('map-detail').textContent).toBe('Map (5, 7) · $98E5 · tile 229');
  });

  it('says "No ROM loaded" without a ROM', async () => {
    await renderView(TilemapsView, INITIAL_TILEMAPS_STATE, null);
    expect(screen.getByText('No ROM loaded')).toBeTruthy();
  });
});
