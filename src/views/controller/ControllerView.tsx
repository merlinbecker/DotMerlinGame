import type { PointerEvent } from 'react';
import type { Button, ViewInstanceProps } from '../../core/index.ts';
import styles from './ControllerView.module.css';

interface PadButtonProps {
  readonly button: Button;
  readonly label: string;
  readonly className: string | undefined;
  readonly press: (button: Button, pressed: boolean) => void;
}

/** One touch button; pointer capture keeps the press until this finger is lifted (multi-touch safe). */
function PadButton({ button, label, className, press }: PadButtonProps) {
  const down = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer already gone (or synthetic): the press still counts, release comes with pointerup.
    }
    press(button, true);
  };
  const up = () => {
    press(button, false);
  };
  return (
    <button
      type="button"
      className={`${styles.button} ${className ?? ''}`}
      aria-label={button}
      data-button={button}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
    >
      {label}
    </button>
  );
}

/** The eight DMG buttons by touch (FR-006); keyboard and game controllers live in src/adapters/input. */
export function ControllerView({ context }: ViewInstanceProps<null>) {
  const press = (button: Button, pressed: boolean) => {
    context.dispatch({ type: pressed ? 'ButtonDown' : 'ButtonUp', button });
  };

  return (
    <div className={styles.pad}>
      <div className={styles.dpad}>
        <PadButton button="Up" label="▲" className={styles.up} press={press} />
        <PadButton button="Left" label="◀" className={styles.left} press={press} />
        <PadButton button="Right" label="▶" className={styles.right} press={press} />
        <PadButton button="Down" label="▼" className={styles.down} press={press} />
      </div>
      <div className={styles.actions}>
        <PadButton button="B" label="B" className={styles.b} press={press} />
        <PadButton button="A" label="A" className={styles.a} press={press} />
      </div>
      <div className={styles.menu}>
        <PadButton button="Select" label="Select" className={undefined} press={press} />
        <PadButton button="Start" label="Start" className={undefined} press={press} />
      </div>
    </div>
  );
}
