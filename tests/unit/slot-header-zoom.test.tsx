import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SlotHeader } from '../../src/app/layout/SlotHeader.tsx';

afterEach(cleanup);

describe('slot header zoom button (FR-023, no gesture)', () => {
  it('offers Maximize on an occupied slot and reflects the state', () => {
    const onToggle = vi.fn();
    const { rerender } = render(<SlotHeader title="Screen" onPrevious={vi.fn()} onNext={vi.fn()} zoom={{ maximized: false, onToggle }} />);
    const button = screen.getByRole('button', { name: 'Maximize' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<SlotHeader title="Screen" onPrevious={vi.fn()} onNext={vi.fn()} zoom={{ maximized: true, onToggle }} />);
    expect(screen.getByRole('button', { name: 'Restore' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('has no zoom button on an empty slot', () => {
    render(<SlotHeader title="Empty" onPrevious={vi.fn()} onNext={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Maximize' })).toBeNull();
  });

  it('does not react to a double tap on the header', () => {
    const onToggle = vi.fn();
    render(<SlotHeader title="Screen" onPrevious={vi.fn()} onNext={vi.fn()} zoom={{ maximized: false, onToggle }} />);
    fireEvent.doubleClick(screen.getByTestId('slot-header'));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
