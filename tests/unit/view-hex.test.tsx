import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HexView } from '../../src/views/hex/HexView.tsx';
import { INITIAL_HEX_STATE } from '../../src/views/hex/definition.ts';
import { expectOnlyInspectActions } from '../support/dispatch-spy.ts';
import { fixtureSnapshots } from '../support/inspection-fixtures.ts';
import { renderView, withChanges } from '../support/render-view.tsx';

afterEach(cleanup);

const [mem] = fixtureSnapshots('inspect-mem');
if (!mem) throw new Error('fixture missing');

/** Text of the row starting at `address`, e.g. "$C000". */
function row(address: string) {
  return screen.getByTestId(`row-${address}`);
}

const chooseArea = (label: string) => {
  fireEvent.change(screen.getByLabelText('Area'), { target: { value: label } });
};

describe('Hex view (US1)', () => {
  it('shows addresses and bytes in hex (US1-AS1)', async () => {
    const view = await renderView(HexView, INITIAL_HEX_STATE, mem);
    // WRAM $C000 + i = i XOR $5A (tests/roms/src/inspect-mem.asm)
    expect(row('$C000').textContent).toContain('$C000');
    expect(within(row('$C000')).getAllByTestId('byte').slice(0, 4).map((b) => b.textContent)).toEqual(['5A', '5B', '58', '59']);
    expectOnlyInspectActions(view.actions);
  });

  it('shows any ROM bank and marks the mapped one (US1-AS3)', async () => {
    await renderView(HexView, INITIAL_HEX_STATE, mem);
    chooseArea('rom');
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'Next bank' }));
    expect(screen.getByTestId('bank').textContent).toBe('Bank 5 / 8');
    expect(within(row('$4000')).getAllByTestId('byte')[0]?.textContent).toBe('05');
    expect(screen.queryByText('mapped')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Previous bank' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous bank' }));
    expect(screen.getByText('mapped')).toBeTruthy();
  });

  it('shows locked cartridge RAM banks with their content (US1-AS3, Clarification Q4)', async () => {
    await renderView(HexView, INITIAL_HEX_STATE, mem);
    chooseArea('cart-ram');
    fireEvent.click(screen.getByRole('button', { name: 'Next bank' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next bank' }));
    expect(within(row('$A000')).getAllByTestId('byte').slice(0, 2).map((b) => b.textContent)).toEqual(['02', 'C2']);
    expect(screen.getByText('mapped')).toBeTruthy();
    expect(screen.getByText('locked')).toBeTruthy();
  });

  it('names the I/O registers, not their bits (US1-AS7)', async () => {
    await renderView(HexView, { ...INITIAL_HEX_STATE, area: 'io', topAddress: 0xff40 }, mem);
    expect(row('$FF40').textContent).toContain('LCDC');
    expect(screen.getByText(/Internal emulator values; unused bits may differ from what the CPU reads\./)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Go to address'), { target: { value: 'FF03' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(row('$FF03').textContent).toMatch(/^\$FF03[0-9A-F]{2}$/);
  });

  it('marks changed bytes by inversion, not color (US1-AS4, FR-011)', async () => {
    const view = await renderView(HexView, INITIAL_HEX_STATE, mem);
    view.show(withChanges(mem, (m) => { m.wram[1] = 0x00; }));
    const bytes = within(row('$C000')).getAllByTestId('byte');
    expect(bytes[1]?.getAttribute('data-changed')).toBe('true');
    expect(bytes[0]?.getAttribute('data-changed')).toBe('false');
  });

  it('only highlights a tapped byte (US1-AS6)', async () => {
    const view = await renderView(HexView, INITIAL_HEX_STATE, mem);
    fireEvent.click(within(row('$C000')).getAllByTestId('byte')[2] as HTMLElement);
    expect(view.states.at(-1)?.selected).toBe(0xc002);
    expect(within(row('$C000')).getAllByTestId('byte')[2]?.getAttribute('data-selected')).toBe('true');
    expectOnlyInspectActions(view.actions);
  });

  it('jumps to an address in one step (US1-AS5, SC-006)', async () => {
    const view = await renderView(HexView, INITIAL_HEX_STATE, mem);
    const before = view.states.length;
    fireEvent.change(screen.getByLabelText('Go to address'), { target: { value: 'C1F3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(view.states.length - before).toBe(1);
    expect(row('$C1F0')).toBeTruthy();
    expect(view.states.at(-1)?.selected).toBe(0xc1f3);
  });

  it('pages without scrolling (US1-AS2)', async () => {
    await renderView(HexView, INITIAL_HEX_STATE, mem);
    const first = screen.getAllByTestId(/^row-/)[0]?.textContent;
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getAllByTestId(/^row-/)[0]?.textContent).not.toBe(first);
  });

  it('says "No ROM loaded" without a ROM (FR-015)', async () => {
    await renderView(HexView, INITIAL_HEX_STATE, null);
    expect(screen.getByText('No ROM loaded')).toBeTruthy();
  });

  it('does not offer cartridge RAM for a ROM without RAM', async () => {
    const [none] = fixtureSnapshots('mbc-none');
    await renderView(HexView, { ...INITIAL_HEX_STATE, area: 'cart-ram' }, none ?? null);
    const option = screen.getByRole<HTMLOptionElement>('option', { name: 'Cart RAM' });
    expect(option.disabled).toBe(true);
    expect(screen.getByText('This cartridge has no RAM.')).toBeTruthy();
  });

  it('shows a too large bank as bank 0', async () => {
    await renderView(HexView, { ...INITIAL_HEX_STATE, area: 'rom', romBank: 40 }, mem);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId('bank').textContent).toBe('Bank 0 / 8');
  });
});
