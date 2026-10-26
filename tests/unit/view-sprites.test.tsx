import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SpritesView } from '../../src/views/sprites/SpritesView.tsx';
import { INITIAL_SPRITES_STATE, spritesDefinition } from '../../src/views/sprites/definition.ts';
import { expectOnlyInspectActions } from '../support/dispatch-spy.ts';
import { fixtureSnapshots } from '../support/inspection-fixtures.ts';
import { renderView, withChanges } from '../support/render-view.tsx';

afterEach(cleanup);

const [gfx] = fixtureSnapshots('inspect-gfx');
const [tall] = fixtureSnapshots('inspect-gfx-tall');
if (!gfx || !tall) throw new Error('fixture missing');

const entry = (index: number) => screen.getByTestId(`sprite-${String(index)}`).textContent;

describe('Sprites view (US5)', () => {
  it('starts raw on the first page at one update per second', () => {
    expect(spritesDefinition.initialState).toEqual({ rate: 'second', palette: 'raw', page: 0 });
  });

  it('shows the fields of each entry as written by the test ROM (US5-AS1)', async () => {
    const view = await renderView(SpritesView, INITIAL_SPRITES_STATE, gfx);
    // tests/roms/src/inspect-gfx.asm ObjectTable
    expect(entry(0)).toBe('#0 Y 16 X 8 tile $01 · prio 0 · flip –– · OBP0');
    expect(entry(1)).toBe('#1 Y 80 X 80 tile $02 · prio 0 · flip X– · OBP0');
    expect(entry(2)).toBe('#2 Y 100 X 120 tile $03 · prio 0 · flip –Y · OBP0');
    expect(entry(3)).toBe('#3 Y 50 X 60 tile $04 · prio 1 · flip –– · OBP0');
    expect(entry(4)).toBe('#4 Y 60 X 30 tile $05 · prio 0 · flip –– · OBP1');
    expectOnlyInspectActions(view.actions);
  });

  it('names hidden entries without color (US5-AS3)', async () => {
    await renderView(SpritesView, INITIAL_SPRITES_STATE, gfx);
    for (const index of [5, 6, 7]) expect(entry(index)).toContain('hidden');
    expect(entry(0)).not.toContain('hidden');
  });

  it('shows 8 × 16 objects with both tiles; Y = 2 becomes visible (US5-AS2)', async () => {
    await renderView(SpritesView, INITIAL_SPRITES_STATE, tall);
    expect(screen.getByText('8×16')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Sprite 0 tile' }).getAttribute('height')).toBe('16');
    expect(entry(7)).not.toContain('hidden');
  });

  it('pages through all 40 entries without scrolling', async () => {
    await renderView(SpritesView, INITIAL_SPRITES_STATE, gfx);
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(entry(39)).toContain('#39');
  });

  it('switches to the OBP palettes', async () => {
    const view = await renderView(SpritesView, INITIAL_SPRITES_STATE, gfx);
    fireEvent.click(screen.getByRole('button', { name: 'OBP' }));
    expect(view.states.at(-1)?.palette).toBe('obp');
  });

  it('marks a changed entry', async () => {
    const view = await renderView(SpritesView, INITIAL_SPRITES_STATE, gfx);
    view.show(withChanges(gfx, (m) => { m.oam[4 + 1] = 81; }));
    expect(screen.getByTestId('sprite-1').getAttribute('data-changed')).toBe('true');
    expect(screen.getByTestId('sprite-0').getAttribute('data-changed')).toBe('false');
  });

  it('says "No ROM loaded" without a ROM', async () => {
    await renderView(SpritesView, INITIAL_SPRITES_STATE, null);
    expect(screen.getByText('No ROM loaded')).toBeTruthy();
  });
});
