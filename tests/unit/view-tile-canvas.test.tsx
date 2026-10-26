import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TileCanvas, toGrayRgba } from '../../src/views/inspect-common/TileCanvas.tsx';

afterEach(cleanup);

describe('TileCanvas (FR-014)', () => {
  it('turns color indices into opaque gray pixels', () => {
    expect([...toGrayRgba(Uint8Array.of(0, 3), [255, 200, 56, 0])]).toEqual([255, 255, 255, 255, 0, 0, 0, 255]);
  });

  it('scales by an integer factor and reports the tapped picture pixel', () => {
    const onTap = vi.fn();
    render(<TileCanvas pixels={new Uint8Array(16 * 8)} width={16} height={8} scale={3} label="Tiles" onTap={onTap} />);
    const canvas = screen.getByRole('img', { name: 'Tiles' });
    expect(canvas.style.width).toBe('48px');
    expect(canvas.style.height).toBe('24px');
    fireEvent.click(canvas, { clientX: 10, clientY: 7 });
    expect(onTap).toHaveBeenCalledWith(3, 2);
  });
});
