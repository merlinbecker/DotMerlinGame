import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { FrameSnapshot } from '../../src/core/index.ts';
import { RegistersView } from '../../src/views/registers/RegistersView.tsx';
import { registersDefinition } from '../../src/views/registers/definition.ts';
import { expectOnlyInspectActions } from '../support/dispatch-spy.ts';
import { fixtureSnapshots } from '../support/inspection-fixtures.ts';
import { renderView } from '../support/render-view.tsx';

afterEach(cleanup);

const [regs] = fixtureSnapshots('inspect-regs');
const [halted] = fixtureSnapshots('inspect-regs-halted');
if (!regs || !halted) throw new Error('fixture missing');

const value = (name: string) => screen.getByTestId(`reg-${name}`).textContent;

describe('Registers view (US2, FR-006)', () => {
  it('starts at one update per second', () => {
    expect(registersDefinition.initialState).toEqual({ rate: 'second' });
    expect(registersDefinition.inspects).toBe(true);
  });

  it('shows the 8-bit registers, pairs, SP and PC in hex (US2-AS1)', async () => {
    const view = await renderView(RegistersView, registersDefinition.initialState, regs);
    // tests/roms/src/inspect-regs.asm
    expect(['A', 'F', 'B', 'C', 'D', 'E', 'H', 'L'].map(value)).toEqual(['$12', '$90', '$34', '$56', '$78', '$9A', '$BC', '$DE']);
    expect(['BC', 'DE', 'HL', 'SP'].map(value)).toEqual(['$3456', '$789A', '$BCDE', '$DFF0']);
    expect(value('PC')).toMatch(/^\$0[0-9A-F]{3}$/);
    expectOnlyInspectActions(view.actions);
  });

  it('shows the flags by characters, not color', async () => {
    await renderView(RegistersView, registersDefinition.initialState, regs);
    expect(screen.getByTestId('flag-Z').textContent).toBe('Z ●');
    expect(screen.getByTestId('flag-N').textContent).toBe('N ○');
    expect(screen.getByTestId('flag-H').textContent).toBe('H ○');
    expect(screen.getByTestId('flag-C').textContent).toBe('C ●');
    expect(screen.getByTestId('flag-Z').getAttribute('aria-label')).toBe('Z set');
  });

  it('shows IME and HALT (FR-006)', async () => {
    await renderView(RegistersView, registersDefinition.initialState, regs);
    expect([value('IME'), value('HALT')]).toEqual(['off', 'off']);
    cleanup();
    await renderView(RegistersView, registersDefinition.initialState, halted);
    expect([value('IME'), value('HALT')]).toEqual(['on', 'on']);
  });

  it('marks a register that changed since the last update (US2-AS3)', async () => {
    const view = await renderView(RegistersView, registersDefinition.initialState, regs);
    const next: FrameSnapshot = { ...regs, frame: regs.frame + 60, registers: { ...regs.registers, b: 0x35 } };
    view.show(next);
    expect(screen.getByTestId('reg-B').getAttribute('data-changed')).toBe('true');
    expect(screen.getByTestId('reg-BC').getAttribute('data-changed')).toBe('true');
    expect(screen.getByTestId('reg-A').getAttribute('data-changed')).toBe('false');
  });

  it('asks for exactly one snapshot when paused (US2-AS2)', async () => {
    const view = await renderView(RegistersView, registersDefinition.initialState, regs);
    view.actions.length = 0;
    act(() => {
      view.events.publish({ type: 'RunStateChanged', runState: 'paused' });
    });
    expect(view.actions).toEqual([{ type: 'RequestSnapshot' }]);
  });

  it('says "No ROM loaded" without a ROM', async () => {
    await renderView(RegistersView, registersDefinition.initialState, null);
    expect(screen.getByText('No ROM loaded')).toBeTruthy();
  });
});
