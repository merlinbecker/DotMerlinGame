import { RATE_LABELS, type InspectRate } from './rate.ts';
import styles from './Inspect.module.css';

const RATES: readonly InspectRate[] = ['live', 'second', 'manual'];

/** The three refresh rates of a memory view as large buttons (FR-010). */
export function RateBar({ rate, onChange }: { readonly rate: InspectRate; readonly onChange: (rate: InspectRate) => void }) {
  return (
    <div className={styles.bar} role="group" aria-label="Refresh rate">
      {RATES.map((r) => (
        <button key={r} type="button" className={styles.button} aria-pressed={r === rate} onClick={() => { onChange(r); }}>
          {RATE_LABELS[r]}
        </button>
      ))}
    </div>
  );
}
