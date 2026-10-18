import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { ViewInstanceProps } from '../../core/index.ts';
import { readShades } from '../shades.ts';
import { EINK_RATES, type ScreenViewState } from './definition.ts';
import { renderEink } from './eink.ts';
import styles from './ScreenView.module.css';

const WIDTH = 160;
const HEIGHT = 144;
/** Approximate pictures per second for the e-ink rate buttons (DMG ≈ 60 frames/s). */
const RATE_LABEL: Record<(typeof EINK_RATES)[number], string> = { 4: '15/s', 6: '10/s', 15: '4/s', 30: '2/s' };

/**
 * Draws the emulator picture; only reads the frame state, never touches the emulator (Constitution II).
 * In e-ink mode the slot asks for every n-th frame only (SetFrameRate), the emulation itself keeps its speed.
 */
export function ScreenView({ context, state, setState }: ViewInstanceProps<ScreenViewState>) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const redraws = useRef(0);
  const snapshot = useSyncExternalStore(
    (onChange) => context.frameState.subscribe(onChange),
    () => context.frameState.getSnapshot(),
  );
  const shades = useMemo(() => readShades(), []);
  const einkGrays = useMemo(() => readShades('--game-eink-shade-').map(([r]) => r) as [number, number, number, number], []);
  const eink = state.mode === 'eink';

  useEffect(() => {
    context.dispatch({ type: 'SetFrameRate', rate: eink ? { kind: 'reduced', everyNthFrame: state.einkEveryNthFrame } : { kind: 'full' } });
  }, [context, eink, state.einkEveryNthFrame]);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !snapshot) return;
    const image = ctx.createImageData(WIDTH, HEIGHT);
    if (eink) {
      const palette = state.einkMapping === 'contrast' ? einkGrays : (shades.map(([r]) => r) as [number, number, number, number]);
      const grays = renderEink(snapshot.screen, { palette, dither: state.einkDither });
      for (let i = 0; i < grays.length; i++) {
        const g = grays[i] ?? 0;
        image.data.set([g, g, g, 255], i * 4);
      }
    } else {
      for (let i = 0; i < WIDTH * HEIGHT; i++) {
        const [r, g, b] = shades[snapshot.screen[i] ?? 0] ?? [0, 0, 0];
        image.data.set([r, g, b, 255], i * 4);
      }
    }
    ctx.putImageData(image, 0, 0);
    redraws.current++;
    canvas.current?.setAttribute('data-redraws', String(redraws.current));
  }, [snapshot, shades, einkGrays, eink, state.einkMapping, state.einkDither]);

  const scale = Math.max(1, Math.floor(Math.min(context.size.width / WIDTH, (context.size.height * 0.62) / HEIGHT)));
  const update = (patch: Partial<ScreenViewState>) => {
    setState({ ...state, ...patch });
  };

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
      <div className={styles.controls}>
        <button type="button" className={styles.button} aria-pressed={eink} onClick={() => { update({ mode: eink ? 'normal' : 'eink' }); }}>
          E-Ink mode
        </button>
        {eink && (
          <>
            {EINK_RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                className={styles.button}
                aria-pressed={state.einkEveryNthFrame === rate}
                onClick={() => { update({ einkEveryNthFrame: rate }); }}
              >
                {RATE_LABEL[rate]}
              </button>
            ))}
            <button
              type="button"
              className={styles.button}
              aria-pressed={state.einkMapping === 'contrast'}
              onClick={() => { update({ einkMapping: state.einkMapping === 'contrast' ? 'linear' : 'contrast' }); }}
            >
              High contrast
            </button>
            <button type="button" className={styles.button} aria-pressed={state.einkDither} onClick={() => { update({ einkDither: !state.einkDither }); }}>
              Dither
            </button>
          </>
        )}
      </div>
    </div>
  );
}
