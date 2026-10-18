import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { ViewInstanceProps } from '../../core/index.ts';
import { readShades } from '../shades.ts';
import type { ScreenViewState } from './definition.ts';
import styles from './ScreenView.module.css';

const WIDTH = 160;
const HEIGHT = 144;

/** Draws the emulator picture; only reads the frame state, never touches the emulator (Constitution II). */
export function ScreenView({ context }: ViewInstanceProps<ScreenViewState>) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const snapshot = useSyncExternalStore(
    (onChange) => context.frameState.subscribe(onChange),
    () => context.frameState.getSnapshot(),
  );
  const shades = useMemo(() => readShades(), []);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !snapshot) return;
    const image = ctx.createImageData(WIDTH, HEIGHT);
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
      const [r, g, b] = shades[snapshot.screen[i] ?? 0] ?? [0, 0, 0];
      image.data[i * 4] = r;
      image.data[i * 4 + 1] = g;
      image.data[i * 4 + 2] = b;
      image.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }, [snapshot, shades]);

  const scale = Math.max(1, Math.floor(Math.min(context.size.width / WIDTH, (context.size.height * 0.8) / HEIGHT)));
  return (
    <div className={styles.screen}>
      <canvas
        ref={canvas}
        className={styles.canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH * scale, height: HEIGHT * scale }}
        data-testid="screen-canvas"
        data-frame={snapshot?.frame ?? 0}
        aria-label="Game screen"
        role="img"
      />
    </div>
  );
}
