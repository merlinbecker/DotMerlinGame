import { useEffect, useMemo, useRef } from 'react';
import { readShades } from '../shades.ts';
import styles from './Inspect.module.css';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Color indices 0–3 to RGBA with the given gray levels (index 0 = lightest). */
export function toGrayRgba(pixels: Uint8Array, grays: readonly number[]): Uint8ClampedArray<ArrayBuffer> {
  const rgba = new Uint8ClampedArray(pixels.length * 4);
  for (let i = 0; i < pixels.length; i++) {
    const g = grays[pixels[i] ?? 0] ?? 0;
    rgba[i * 4] = g;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = g;
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

interface TileCanvasProps {
  /** width × height color indices 0–3, row-major. */
  readonly pixels: Uint8Array;
  readonly width: number;
  readonly height: number;
  /** Integer CSS pixels per picture pixel. */
  readonly scale: number;
  readonly label: string;
  /** Frames drawn on top as black and white double lines, never color (e.g. the visible screen area). */
  readonly rects?: readonly Rect[];
  /** Picture pixel that was tapped. */
  readonly onTap?: (x: number, y: number) => void;
  readonly frame?: number | undefined;
}

/**
 * Pixel picture of tiles in the high-contrast grays of the screen's e-ink mode (FR-014), scaled by an
 * integer factor without smoothing.
 */
export function TileCanvas({ pixels, width, height, scale, label, rects = [], onTap, frame }: TileCanvasProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const grays = useMemo(() => readShades('--game-eink-shade-').map(([r]) => r), []);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(new ImageData(toGrayRgba(pixels, grays), width, height), 0, 0);
    // Darkest and lightest token shades, so the frame stays visible on any tile content.
    const gray = (g: number) => `rgb(${String(g)} ${String(g)} ${String(g)})`;
    for (const rect of rects) {
      ctx.strokeStyle = gray(grays[3] ?? 0);
      ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1);
      ctx.strokeStyle = gray(grays[0] ?? 255);
      ctx.strokeRect(rect.x + 1.5, rect.y + 1.5, rect.width - 3, rect.height - 3);
    }
  }, [pixels, grays, width, height, rects]);

  return (
    <canvas
      ref={canvas}
      className={styles.canvas}
      width={width}
      height={height}
      style={{ width: width * scale, height: height * scale }}
      role="img"
      aria-label={label}
      data-frame={frame}
      onClick={
        onTap &&
        ((event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const x = Math.floor((event.clientX - box.left) / scale);
          const y = Math.floor((event.clientY - box.top) / scale);
          if (x >= 0 && y >= 0 && x < width && y < height) onTap(x, y);
        })
      }
    />
  );
}
